import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a 6-digit OTP verification email.
 * @param {string} to   – recipient email address
 * @param {string} otp  – the 6-digit code
 */
export const sendOtpEmail = async (to, otp) => {
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject: "Your CueConnect Verification Code",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">CueConnect</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#888;">Admin Email Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#d1d1d1;line-height:1.6;">
                Use the verification code below to complete your admin registration. This code expires in <strong style="color:#fff;">5 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#1a1a1a;border:1px solid rgba(220,38,38,0.25);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#ef4444;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">
                If you didn't request this code, you can safely ignore this email. Do not share this code with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:11px;color:#555;">
                &copy; ${new Date().getFullYear()} CueConnect &middot; GOODSHOT Snooker Lounge
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim()
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error("Failed to send verification email");
    }

    return data;
};
