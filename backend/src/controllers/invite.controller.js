import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { isSuperAdmin } from "../lib/access.js";
import { notifyInvite } from "../lib/notifications.js";
import { cleanUrl } from "../lib/emailTemplates.js";

// Trusted-renter invites. An owner emails a single-use link; whoever claims it
// while signed in gets an OwnerGrant, i.e. standing access to all of that
// owner's private properties (see lib/access.js). Only the SHA-256 of the token
// is stored, so a database read can't reveal working links.

const INVITE_TTL_DAYS = 14;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  name: z.string().trim().optional().default(""),
  // SuperAdmin only: invite on behalf of another owner.
  ownerId: z.string().trim().optional(),
});

// Owners manage their own invites/grants; SuperAdmin sees every owner's.
const ownerWhere = (u) => (isSuperAdmin(u) ? {} : { ownerId: u.id });

const serializeInvite = (i) => ({
  _id: i.id,
  email: i.email,
  createdAt: i.createdAt,
  expiresAt: i.expiresAt,
  expired: i.expiresAt < new Date(),
  ...(i.owner && { owner: { _id: i.owner.id, name: i.owner.name } }),
});

const serializeGrant = (g) => ({
  _id: g.id,
  createdAt: g.createdAt,
  guest: { _id: g.guest.id, name: g.guest.name, email: g.guest.email },
  ...(g.owner && { owner: { _id: g.owner.id, name: g.owner.name } }),
});

function inviteUrl(token) {
  const site = cleanUrl(process.env.FRONTEND_URL) || "http://localhost:4000";
  return `${site}/invite/${token}`;
}

export async function createInvite(req, res, next) {
  try {
    const body = inviteSchema.parse(req.body);
    const email = body.email.toLowerCase();

    let owner = req.user;
    if (isSuperAdmin(req.user) && body.ownerId && body.ownerId !== req.user.id) {
      owner = await prisma.user.findFirst({
        where: { id: body.ownerId, role: { in: ["Owner", "SuperAdmin"] }, isActive: true },
      });
      if (!owner) throw new ApiError("Selected owner not found.", 400);
    }
    if (email === owner.email.toLowerCase()) throw new ApiError("You can't invite yourself.", 400);

    const existingGuest = await prisma.user.findUnique({ where: { email } });
    if (existingGuest) {
      const grant = await prisma.ownerGrant.findFirst({
        where: { ownerId: owner.id, guestUserId: existingGuest.id, revokedAt: null },
      });
      if (grant) throw new ApiError("That person is already one of your trusted renters.", 409);
    }

    // One live invite per email: re-inviting replaces (revokes) the earlier link.
    await prisma.ownerInvite.updateMany({
      where: { ownerId: owner.id, email, claimedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("base64url");
    const invite = await prisma.ownerInvite.create({
      data: {
        ownerId: owner.id,
        email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      },
    });

    const url = inviteUrl(token);
    void notifyInvite({ owner, email, inviteeName: body.name, inviteUrl: url, days: INVITE_TTL_DAYS });

    // The link is returned once so the owner can also share it themselves
    // (text message, etc.) - it can't be recovered later.
    return res.status(201).json({
      success: true,
      message: "Invitation created",
      data: { ...serializeInvite(invite), inviteUrl: url },
    });
  } catch (err) {
    next(err);
  }
}

export async function listInvites(req, res, next) {
  try {
    const invites = await prisma.ownerInvite.findMany({
      where: { ...ownerWhere(req.user), claimedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true } } },
    });
    return ok(res, invites.map(serializeInvite));
  } catch (err) {
    next(err);
  }
}

export async function revokeInvite(req, res, next) {
  try {
    const { count } = await prisma.ownerInvite.updateMany({
      where: { id: req.params.id, ...ownerWhere(req.user), claimedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw new ApiError("Invitation not found.", 404);
    return ok(res, null, "Invitation cancelled");
  } catch (err) {
    next(err);
  }
}

// Public: lets the /invite/[token] page say who invited you before you sign
// in. Reveals only the owner's name and the invited email (the link is the
// credential); unusable links all look the same.
export async function previewInvite(req, res, next) {
  try {
    const invite = await prisma.ownerInvite.findUnique({
      where: { tokenHash: hashToken(String(req.params.token)) },
      include: { owner: { select: { name: true } } },
    });
    if (!invite || invite.claimedAt || invite.revokedAt || invite.expiresAt < new Date()) {
      throw new ApiError("This invitation is no longer valid.", 404);
    }
    return ok(res, { ownerName: invite.owner.name, email: invite.email });
  } catch (err) {
    next(err);
  }
}

export async function claimInvite(req, res, next) {
  try {
    const { token } = z.object({ token: z.string().trim().min(10) }).parse(req.body);

    const invite = await prisma.ownerInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { owner: { select: { id: true, name: true, isActive: true } } },
    });
    if (!invite || invite.revokedAt || invite.expiresAt < new Date() || !invite.owner.isActive) {
      throw new ApiError("This invitation is no longer valid. Ask the owner to send a new one.", 410);
    }
    if (invite.ownerId === req.user.id) throw new ApiError("You can't accept your own invitation.", 400);

    // Idempotent for the person who already claimed it (e.g. a page reload).
    if (invite.claimedAt && invite.claimedByUserId !== req.user.id) {
      throw new ApiError("This invitation has already been used.", 410);
    }

    if (!invite.claimedAt) {
      await prisma.$transaction([
        prisma.ownerInvite.update({
          where: { id: invite.id },
          data: { claimedAt: new Date(), claimedByUserId: req.user.id },
        }),
        prisma.ownerGrant.upsert({
          where: { ownerId_guestUserId: { ownerId: invite.ownerId, guestUserId: req.user.id } },
          create: { ownerId: invite.ownerId, guestUserId: req.user.id },
          update: { revokedAt: null },
        }),
      ]);
    }

    return ok(res, { ownerName: invite.owner.name }, "Invitation accepted");
  } catch (err) {
    next(err);
  }
}

export async function listGrants(req, res, next) {
  try {
    const grants = await prisma.ownerGrant.findMany({
      where: { ...ownerWhere(req.user), revokedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    return ok(res, grants.map(serializeGrant));
  } catch (err) {
    next(err);
  }
}

export async function revokeGrant(req, res, next) {
  try {
    const { count } = await prisma.ownerGrant.updateMany({
      where: { id: req.params.id, ...ownerWhere(req.user), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw new ApiError("Trusted renter not found.", 404);
    return ok(res, null, "Access revoked");
  } catch (err) {
    next(err);
  }
}
