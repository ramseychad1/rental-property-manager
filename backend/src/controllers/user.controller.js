import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { ok, fail, ApiError } from "../lib/response.js";
import { serializeUser, serializeBooking } from "../lib/serialize.js";
import { COOKIE_NAME, cookieOptions } from "../lib/jwt.js";
import { saveFile, deleteFile } from "../lib/storage.js";
import { isSuperAdmin } from "../lib/access.js";
import { generateTempPassword } from "../lib/tempPassword.js";
import { sendMail } from "../lib/mailer.js";
import { credentialsEmail } from "../lib/emailTemplates.js";

export async function me(req, res) {
  if (!req.user) return fail(res, "Not authenticated", 401);
  return ok(res, serializeUser(req.user));
}

export async function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return ok(res, null, "Logged out");
}

export async function updateProfile(req, res, next) {
  try {
    if (!req.user) throw new ApiError("Not authenticated", 401);

    const schema = z.object({
      name: z.string().trim().min(1).optional(),
      phone: z.string().trim().optional(),
    });
    const body = schema.parse(req.body);

    const data = {};
    if (body.name) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;

    if (req.file) {
      if (req.user.picture) await deleteFile(req.user.picture);
      const { url } = await saveFile(req.file);
      data.picture = url;
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    return ok(res, serializeUser(user), "Profile updated");
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    if (!req.user) throw new ApiError("Not authenticated", 401);

    // The admin panel sends `oldPassword`, the public site `currentPassword`.
    const schema = z
      .object({
        currentPassword: z.string().min(1).optional(),
        oldPassword: z.string().min(1).optional(),
        newPassword: z.string().min(6),
      })
      .refine((d) => d.currentPassword || d.oldPassword, { message: "Current password is required" });
    const parsed = schema.parse(req.body);
    const currentPassword = parsed.currentPassword ?? parsed.oldPassword;
    const { newPassword } = parsed;

    const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!valid) throw new ApiError("Current password is incorrect.", 400);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash, mustChangePassword: false } });

    return ok(res, null, "Password updated");
  } catch (err) {
    next(err);
  }
}

export async function listAllUsers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const { search, role } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (role && role !== "all") {
      // The admin UI labels Guest accounts "User".
      where.role = role === "User" ? "Guest" : role;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return ok(res, {
      users: users.map(serializeUser),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function userBookings(req, res, next) {
  try {
    const { userId } = req.params;

    if (!req.user) throw new ApiError("Not authenticated", 401);
    if (!isSuperAdmin(req.user) && req.user.id !== userId) {
      throw new ApiError("Forbidden", 403);
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { property: true, user: true },
      orderBy: { createdAt: "desc" },
    });

    return ok(res, {
      bookings: bookings.map(serializeBooking),
      pagination: { total: bookings.length, page: 1, pageSize: bookings.length },
    });
  } catch (err) {
    next(err);
  }
}

/* --------------------------- SuperAdmin user management -------------------------- */

const STAFF_ROLES = ["Owner", "SuperAdmin"];

// Credentials shown once in the admin UI for the SuperAdmin to pass along by
// hand - no email provider is wired up. `loginUrl` is the admin console the
// request came from.
function credentials(req, user, tempPassword) {
  const loginUrl = req.get("origin") || process.env.ADMIN_URL || "";
  return { loginUrl, email: user.email, tempPassword };
}

export async function createUser(req, res, next) {
  try {
    const body = z
      .object({
        name: z.string().trim().min(1, "Name is required"),
        email: z.string().trim().email("Enter a valid email"),
        role: z.enum(STAFF_ROLES).default("Owner"),
      })
      .parse(req.body);

    const email = body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new ApiError("An account with this email already exists.", 409);
    }

    const tempPassword = generateTempPassword();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        role: body.role,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        isVerified: true,
        mustChangePassword: true,
      },
    });

    return ok(res, { user: serializeUser(user), credentials: credentials(req, user, tempPassword) }, "User created", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const body = z
      .object({
        name: z.string().trim().min(1).optional(),
        role: z.enum(STAFF_ROLES).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) throw new ApiError("User not found.", 404);

    if (target.id === req.user.id && (body.isActive === false || (body.role && body.role !== target.role))) {
      throw new ApiError("You can't deactivate or change the role of your own account.", 400);
    }
    if (body.role && target.role === "Guest") {
      throw new ApiError("Guest accounts can't be changed to staff roles here.", 400);
    }

    const user = await prisma.user.update({ where: { id: target.id }, data: body });
    return ok(res, serializeUser(user), "User updated");
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) throw new ApiError("User not found.", 404);

    const tempPassword = generateTempPassword();
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });

    return ok(res, { user: serializeUser(user), credentials: credentials(req, user, tempPassword) }, "Password reset");
  } catch (err) {
    next(err);
  }
}

// "Email these details" button in the credentials dialog. The temporary
// password isn't stored, so the admin UI sends back what it's showing; we only
// mail it if it is still the user's real, unchanged temporary password - this
// can't be used to email arbitrary text or an already-replaced password.
export async function emailCredentials(req, res, next) {
  try {
    const { tempPassword, reset } = z
      .object({ tempPassword: z.string().min(1), reset: z.boolean().optional() })
      .parse(req.body);

    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) throw new ApiError("User not found.", 404);
    if (!target.mustChangePassword || !(await bcrypt.compare(tempPassword, target.passwordHash))) {
      throw new ApiError("That temporary password is no longer current. Reset the password to get a new one.", 400);
    }

    const loginUrl = req.get("origin") || process.env.ADMIN_URL || "";
    const mail = credentialsEmail({ name: target.name, loginUrl, email: target.email, tempPassword, reset });
    const result = await sendMail({ kind: "credentials", to: target.email, systemOnly: true, redact: true, ...mail });
    if (!result.ok) {
      throw new ApiError(
        result.status === "skipped" ? "Connect a Gmail account in Settings > Email first." : result.error || "Couldn't send the email.",
        result.status === "skipped" ? 400 : 502,
      );
    }
    return ok(res, { sentTo: target.email }, "Email sent");
  } catch (err) {
    next(err);
  }
}
