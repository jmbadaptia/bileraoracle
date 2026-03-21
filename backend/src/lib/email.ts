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
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hola <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      ¡Enhorabuena! Tu organización <strong>${orgName}</strong> ha sido creada en Bilera. Solo queda un paso: activar tu cuenta y elegir una contraseña.
    </p>
    <p style="margin:0 0 24px;text-align:left">
      <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:600">
        Activar mi cuenta
      </a>
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Una vez activada, podrás empezar a gestionar eventos, cursos, documentos y mucho más. Estamos encantados de tenerte.
    </p>
    <p style="margin:0 0 0;font-size:15px;color:#52525b;text-align:left">
      ¡Bienvenido/a! 👋
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;text-align:left;border-top:1px solid #e4e4e7;padding-top:12px">
      Este enlace es válido durante 7 días. Si no puedes hacer clic, copia esta URL:<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `¡${orgName} está lista! Activa tu cuenta`,
    html,
  });
}

export async function sendInviteEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/verificar?token=${token}`;
  const html = baseHtml(`
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hola <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Te han invitado a formar parte del equipo en Bilera. Para unirte, solo tienes que activar tu cuenta y elegir una contraseña.
    </p>
    <p style="margin:0 0 24px;text-align:left">
      <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:600">
        Unirme al equipo
      </a>
    </p>
    <p style="margin:0 0 0;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Una vez dentro, podrás colaborar con el resto del equipo, consultar documentos, inscribirte en cursos y mucho más.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#52525b;text-align:left">
      ¡Te esperamos! 🙌
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;text-align:left;border-top:1px solid #e4e4e7;padding-top:12px">
      Este enlace es válido durante 7 días. Si no puedes hacer clic, copia esta URL:<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: "Te han invitado a Bilera — activa tu cuenta",
    html,
  });
}

export async function sendResetEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/recuperar?token=${token}`;
  const html = baseHtml(`
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hola <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hemos recibido una solicitud para cambiar tu contraseña. Si fuiste tú, haz clic en el botón para elegir una nueva:
    </p>
    <p style="margin:0 0 24px;text-align:left">
      <a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:600">
        Cambiar contraseña
      </a>
    </p>
    <p style="margin:0 0 0;font-size:14px;color:#52525b;line-height:1.6;text-align:left">
      Si no has sido tú, no te preocupes — puedes ignorar este email y tu contraseña seguirá siendo la misma.
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;text-align:left;border-top:1px solid #e4e4e7;padding-top:12px">
      Este enlace caduca en 15 minutos. Si no puedes hacer clic, copia esta URL:<br/>
      <span style="color:#52525b;word-break:break-all">${link}</span>
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: "Cambiar contraseña — Bilera",
    html,
  });
}

interface EnrollmentDetails {
  startDate?: string | Date | null;
  location?: string | null;
  price?: number | null;
  tenantName?: string | null;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export async function sendEnrollmentEmail(
  to: string, name: string, activityTitle: string,
  status: string, activityId: string, cancelToken: string,
  details?: EnrollmentDetails
): Promise<void> {
  const cancelLink = `${getAppUrl()}/inscribirse/${activityId}?cancel=${cancelToken}`;
  const tenantName = details?.tenantName || "la organización";

  const statusText = status === "CONFIRMED"
    ? "Tienes plaza asegurada."
    : status === "PENDING"
    ? "Tu inscripción queda registrada. Se realizará un sorteo para asignar las plazas y te notificaremos el resultado."
    : "Las plazas están completas. Estás en lista de espera y te avisaremos si se libera alguna plaza.";

  const detailLines: string[] = [];
  if (details?.startDate) detailLines.push(`📅 ${formatDate(details.startDate)}`);
  if (details?.startDate) detailLines.push(`🕐 ${formatTime(details.startDate)}`);
  if (details?.location) detailLines.push(`📍 ${details.location}`);
  detailLines.push(`💰 ${details?.price && details.price > 0 ? `${details.price.toFixed(2)}€` : "Gratuito"}`);

  const detailsHtml = detailLines.map(l =>
    `<div style="font-size:14px;color:#52525b;line-height:2">${l}</div>`
  ).join("");

  const html = baseHtml(`
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hola <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Te confirmamos que tu inscripción al curso <strong>${activityTitle}</strong> se ha registrado correctamente. ${statusText}
    </p>
    <div style="background:#f4f4f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:left">
      <div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:8px">Detalles del curso:</div>
      ${detailsHtml}
    </div>
    <p style="margin:0 0 16px;font-size:14px;color:#52525b;line-height:1.6;text-align:left">
      Si no pudieras asistir, te agradeceríamos que canceles tu plaza para que podamos ofrecerla a otra persona:
    </p>
    <p style="margin:0 0 24px;text-align:left">
      <a href="${cancelLink}" style="color:#e11d48;font-size:14px;font-weight:600">👉 Cancelar inscripción</a>
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#52525b;text-align:left">
      Gracias por apuntarte. ¡Nos vemos!
    </p>
    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;text-align:left">
      ${tenantName}
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;text-align:left;border-top:1px solid #e4e4e7;padding-top:12px">
      Email enviado automáticamente desde Bilera en nombre de ${tenantName}.
    </p>
  `);

  const subjectStatus = status === "CONFIRMED" ? "Plaza confirmada" : status === "PENDING" ? "Pendiente de sorteo" : "Lista de espera";

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `${activityTitle} — ${subjectStatus}`,
    html,
  });
}

export async function sendEnrollmentResultEmail(
  to: string, name: string, activityTitle: string, status: string
): Promise<void> {
  const isConfirmed = status === "CONFIRMED";
  const html = baseHtml(`
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      Hola <strong>${name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#52525b;line-height:1.6;text-align:left">
      ${isConfirmed
        ? `¡Enhorabuena! Tu plaza para <strong>${activityTitle}</strong> ha sido confirmada. ¡Nos vemos!`
        : `Lamentablemente no has obtenido plaza en <strong>${activityTitle}</strong>. Estás en lista de espera y te avisaremos si se libera alguna plaza.`
      }
    </p>
  `);

  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: `${activityTitle} — ${isConfirmed ? "¡Plaza confirmada!" : "Lista de espera"}`,
    html,
  });
}
