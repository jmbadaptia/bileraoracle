import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025"),
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : {}),
    });
  }
  return transporter;
}

function getAppUrl(): string {
  return (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
}

function getFrom(): string {
  return process.env.SMTP_FROM || "Bilera <noreply@bilera.es>";
}

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="padding:32px 32px 24px;text-align:center">
${content}
</td></tr>
<tr><td style="padding:16px 32px 32px;text-align:center">
<p style="margin:0;font-size:12px;color:#a1a1aa">Este es un email automático de Bilera. No respondas a este mensaje.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string, orgName: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/verificar?token=${token}`;
  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">¡Bienvenido/a a Bilera, ${name}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6">
      Tu organización <strong>${orgName}</strong> ha sido creada correctamente. Solo falta un paso: activa tu cuenta y establece tu contraseña para empezar a usarla.
    </p>
    <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">
      Activar mi cuenta
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5">
      Este enlace es válido durante 7 días.<br/>
      Si no puedes hacer clic, copia esta URL en tu navegador:<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `Tu organización ${orgName} está lista — activa tu cuenta`,
    html,
  });
}

export async function sendInviteEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/verificar?token=${token}`;
  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">¡Bienvenido/a, ${name}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6">
      Has sido invitado/a a unirte a Bilera. Haz clic en el siguiente enlace para activar tu cuenta y establecer tu contraseña.
    </p>
    <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">
      Activar cuenta
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5">
      Este enlace es válido durante 7 días.<br/>
      Si no puedes hacer clic, copia esta URL en tu navegador:<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: "Activa tu cuenta en Bilera",
    html,
  });
}

export async function sendResetEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/recuperar?token=${token}`;
  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">Hola, ${name}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6">
      Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para elegir una nueva.
    </p>
    <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">
      Restablecer contraseña
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5">
      Este enlace es válido durante 15 minutos.<br/>
      Si no solicitaste este cambio, puedes ignorar este mensaje.<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: "Restablece tu contraseña en Bilera",
    html,
  });
}

const STATUS_LABELS: Record<string, { label: string; desc: string }> = {
  CONFIRMED: { label: "Confirmada", desc: "Tienes plaza confirmada." },
  PENDING: { label: "Pendiente de sorteo", desc: "Tu inscripción ha sido registrada. Se realizará un sorteo para asignar las plazas." },
  WAITLISTED: { label: "Lista de espera", desc: "Las plazas están completas. Estás en lista de espera y te avisaremos si se libera alguna plaza." },
};

export async function sendEnrollmentEmail(
  to: string, name: string, activityTitle: string,
  status: string, activityId: string, cancelToken: string
): Promise<void> {
  const cancelLink = `${getAppUrl()}/inscribirse/${activityId}?cancel=${cancelToken}`;
  const info = STATUS_LABELS[status] || { label: status, desc: "" };

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">Inscripción registrada</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#52525b;line-height:1.6">
      Hola <strong>${name}</strong>, tu inscripción a <strong>${activityTitle}</strong> ha sido registrada.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6">
      <span style="display:inline-block;background:#f0fdf4;color:#166534;padding:4px 12px;border-radius:6px;font-weight:600">
        Estado: ${info.label}
      </span>
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">${info.desc}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;line-height:1.5">
      Si necesitas cancelar tu inscripción:<br/>
      <a href="${cancelLink}" style="color:#e11d48">Cancelar inscripción</a>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `Inscripción: ${activityTitle} — ${info.label}`,
    html,
  });
}

export async function sendEnrollmentResultEmail(
  to: string, name: string, activityTitle: string, status: string
): Promise<void> {
  const isConfirmed = status === "CONFIRMED";
  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">
      ${isConfirmed ? "¡Tienes plaza!" : "Lista de espera"}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6">
      Hola <strong>${name}</strong>,
      ${isConfirmed
        ? `tu plaza para <strong>${activityTitle}</strong> ha sido confirmada.`
        : `lamentablemente no has obtenido plaza en <strong>${activityTitle}</strong>. Estás en lista de espera y te avisaremos si se libera alguna plaza.`
      }
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `${activityTitle} — ${isConfirmed ? "Plaza confirmada" : "Lista de espera"}`,
    html,
  });
}
