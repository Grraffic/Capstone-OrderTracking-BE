require("dotenv").config();
const nodemailer = require("nodemailer");
const supabase = require("../config/supabase");
const { getSpecialAdminEmails } = require("../config/admin");

/**
 * Get all property custodian email addresses (config + database).
 * Merges SPECIAL_ADMIN_EMAILS with users who have role property_custodian, dedupes and normalizes.
 * @returns {Promise<string[]>}
 */
async function getPropertyCustodianEmails() {
  const configEmails = getSpecialAdminEmails();
  const emailsSet = new Set(
    configEmails.map((e) => (e || "").trim().toLowerCase()).filter(Boolean)
  );

  try {
    // Get user_ids from user_roles for property_custodian
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "property_custodian");

    if (!roleError && roleRows && roleRows.length > 0) {
      const userIds = [...new Set(roleRows.map((r) => r.user_id))];
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("email")
        .in("id", userIds)
        .eq("is_active", true);

      if (!usersError && users) {
        users.forEach((u) => {
          const e = (u.email || "").trim().toLowerCase();
          if (e) emailsSet.add(e);
        });
      }
    }

    // Also include users.role = 'property_custodian' in case role is only on users table
    const { data: usersByRole, error: usersByRoleError } = await supabase
      .from("users")
      .select("email")
      .eq("role", "property_custodian")
      .eq("is_active", true);

    if (!usersByRoleError && usersByRole) {
      usersByRole.forEach((u) => {
        const e = (u.email || "").trim().toLowerCase();
        if (e) emailsSet.add(e);
      });
    }
  } catch (err) {
    console.error("Contact service: error resolving property custodian emails:", err);
  }

  return [...emailsSet];
}

/**
 * Send contact form notification to all property custodians via email.
 * Uses EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS. If not set, skips sending and logs.
 * Does not throw; logs errors so contact creation can still return 201.
 * @param {{ name: string | null, email: string | null, message: string | null }} contactPayload
 */
async function sendContactNotificationToCustodians(contactPayload) {
  const { name, email, message } = contactPayload;
  const recipients = await getPropertyCustodianEmails();
  if (recipients.length === 0) {
    console.warn("Contact service: no property custodian emails to notify.");
    return;
  }

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "Contact service: EMAIL_HOST, EMAIL_USER, or EMAIL_PASS not set; skipping contact notification email."
    );
    return;
  }

  const fromAddress = process.env.CONTACT_FROM_EMAIL || user;
  const subject = "New contact form message – La Verdad OrderFlow";
  const bodyText = [
    "A new message was submitted from the contact form.",
    "",
    "From: " + (name || "(not provided)"),
    "Email: " + (email || "(not provided)"),
    "Message:",
    message || "(empty)",
  ].join("\n");

  // Escape for HTML to avoid XSS
  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const safeName = escapeHtml(name || "(not provided)");
  const safeEmail = escapeHtml(email || "(not provided)");
  const safeMessage = escapeHtml(message || "(empty)").replace(/\n/g, "<br>");

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New contact form message</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #003363 0%, #0C2340 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin:0; font-size: 22px; font-weight: 700; color: #ffffff;">
                <span style="color: #ffffff;">La Verdad</span> <span style="color: #F28C28;">OrderFlow</span>
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">Contact form notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">A new message was submitted from the contact form.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr><td style="padding: 20px 24px;">
                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
                  <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #111827;">${safeName}</p>
                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #003363;"><a href="mailto:${safeEmail}" style="color: #F28C28; text-decoration: none;">${safeEmail}</a></p>
                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                  <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">${safeMessage}</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">La Verdad OrderFlow – Uniform ordering system</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: false,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: fromAddress,
      bcc: recipients.join(", "),
      subject,
      text: bodyText,
      html: bodyHtml,
    });
  } catch (err) {
    console.error("Contact service: failed to send notification email:", err);
  }
}

module.exports = {
  getPropertyCustodianEmails,
  sendContactNotificationToCustodians,
};
