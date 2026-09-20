"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";

export default function ContactForm({ successMessage }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    setSubmitting(true);
    try {
      await api.sendContact(form);
      toast.success(successMessage || "Thanks! We'll be in touch soon.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm space-y-5" data-testid="contact-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" data-testid="contact-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="contact-email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" data-testid="contact-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" data-testid="contact-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" data-testid="contact-message" rows={6} value={form.message} onChange={(e) => set("message", e.target.value)} required />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto" data-testid="contact-submit">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send message
          </Button>
    </form>
  );
}
