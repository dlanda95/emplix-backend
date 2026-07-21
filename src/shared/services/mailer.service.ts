/**
 * mailer.service.ts — Proveedor de email pluggable.
 *
 * Detección automática por variables de entorno (en orden de prioridad):
 *
 *   1. Microsoft Graph API  → GRAPH_TENANT_ID + GRAPH_CLIENT_ID + GRAPH_CLIENT_SECRET
 *   2. SMTP (nodemailer)    → SMTP_HOST + SMTP_USER + SMTP_PASS
 *   3. Consola (dev)        → fallback cuando no hay nada configurado
 *
 * Para cambiar de tenant o proveedor solo se modifican variables de entorno.
 * No se toca código.
 *
 * Variables requeridas por proveedor:
 * ─────────────────────────────────────────────────────────────────────────────
 * Graph API (recomendado con Microsoft 365):
 *   GRAPH_TENANT_ID        Azure Directory (tenant) ID
 *   GRAPH_CLIENT_ID        Application (client) ID de la App Registration
 *   GRAPH_CLIENT_SECRET    Client secret de la App Registration
 *   MAIL_FROM              Dirección del buzón compartido: noreply@empresa.com
 *   MAIL_FROM_NAME         Nombre visible (opcional): "Emplix HR"
 *
 * SMTP (Gmail App Password, SendGrid, etc.):
 *   SMTP_HOST              ej: smtp.gmail.com
 *   SMTP_PORT              ej: 587
 *   SMTP_SECURE            "true" si usa SSL/TLS directo (puerto 465)
 *   SMTP_USER              cuenta de email
 *   SMTP_PASS              contraseña o App Password
 *   MAIL_FROM              dirección del remitente
 *   MAIL_FROM_NAME         nombre visible (opcional)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import nodemailer from 'nodemailer';

// ── Config ────────────────────────────────────────────────────────────────────

const GRAPH_TENANT_ID     = process.env.GRAPH_TENANT_ID;
const GRAPH_CLIENT_ID     = process.env.GRAPH_CLIENT_ID;
const GRAPH_CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET;

const SMTP_HOST   = process.env.SMTP_HOST;
const SMTP_PORT   = parseInt(process.env.SMTP_PORT ?? '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;

const MAIL_FROM      = process.env.MAIL_FROM ?? SMTP_USER ?? 'noreply@emplix.com';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? 'Emplix HR';

type Provider = 'graph' | 'smtp' | 'console';

function detectProvider(): Provider {
  if (GRAPH_TENANT_ID && GRAPH_CLIENT_ID && GRAPH_CLIENT_SECRET) return 'graph';
  if (SMTP_HOST && SMTP_USER && SMTP_PASS)                        return 'smtp';
  return 'console';
}

export const activeProvider = detectProvider();

// ── Microsoft Graph — token cache ─────────────────────────────────────────────

interface TokenCache { value: string; expiresAt: number; }
let graphTokenCache: TokenCache | null = null;

async function getGraphToken(): Promise<string> {
  if (graphTokenCache && graphTokenCache.expiresAt > Date.now() + 60_000) {
    return graphTokenCache.value;
  }

  const url  = `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     GRAPH_CLIENT_ID!,
    client_secret: GRAPH_CLIENT_SECRET!,
    scope:         'https://graph.microsoft.com/.default',
  });

  const res  = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const data = await res.json() as { access_token: string; expires_in: number; error_description?: string };

  if (!res.ok) throw new Error(`Graph token error: ${data.error_description ?? JSON.stringify(data)}`);

  graphTokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return graphTokenCache.value;
}

// ── Providers ─────────────────────────────────────────────────────────────────

export interface SendMailOptions {
  to:      string;
  subject: string;
  html:    string;
}

async function sendViaGraph(opts: SendMailOptions): Promise<void> {
  const token = await getGraphToken();
  const url   = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_FROM)}/sendMail`;

  const payload = {
    message: {
      subject:      opts.subject,
      body:         { contentType: 'HTML', content: opts.html },
      toRecipients: [{ emailAddress: { address: opts.to } }],
      from:         { emailAddress: { name: MAIL_FROM_NAME, address: MAIL_FROM } },
    },
    saveToSentItems: false,
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Graph sendMail error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
}

async function sendViaSmtp(opts: SendMailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_SECURE,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from:    `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
  });
}

function sendToConsole(opts: SendMailOptions): void {
  console.log('\n📧 ─── [DEV EMAIL — sin proveedor configurado] ───────────────');
  console.log(`   To:      ${opts.to}`);
  console.log(`   Subject: ${opts.subject}`);
  console.log(`   Preview: ${opts.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)}...`);
  console.log('──────────────────────────────────────────────────────────────\n');
}

// ── Punto de entrada único ────────────────────────────────────────────────────

export async function sendMail(opts: SendMailOptions): Promise<void> {
  switch (activeProvider) {
    case 'graph':   return sendViaGraph(opts);
    case 'smtp':    return sendViaSmtp(opts);
    case 'console': return sendToConsole(opts);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

// ── Email de activación de colaborador (ingreso a la empresa) ─────────────────
export interface EmployeeActivationEmailParams {
  firstName:       string;
  lastName:        string;
  positionName:    string;
  companyName:     string;
  corporateEmail:  string;
  tempPassword:    string;
  loginUrl:        string;
}

export function buildEmployeeActivationEmail(p: EmployeeActivationEmailParams): string {
  const year     = new Date().getFullYear();
  const fullName = `${p.firstName} ${p.lastName}`.trim();
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.09);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c1d1d 0%,#9f2626 100%);padding:32px 36px;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">⚡ Emplix</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.72);">Plataforma de Gestión de Recursos Humanos</p>
            </td>
          </tr>

          <!-- Congratulations banner -->
          <tr>
            <td style="background:#fef2f2;padding:24px 36px;border-bottom:1px solid #fecaca;">
              <p style="margin:0;font-size:28px;text-align:center;">🎉</p>
              <h1 style="margin:10px 0 6px;font-size:22px;font-weight:800;color:#7c1d1d;text-align:center;line-height:1.3;">
                ¡Felicitaciones, ${fullName}!
              </h1>
              <p style="margin:0;font-size:15px;color:#7f1d1d;text-align:center;line-height:1.6;">
                Has sido incorporado/a oficialmente a <strong>${p.companyName}</strong><br>
                como <strong>${p.positionName}</strong>.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                Nos alegra mucho tenerte en el equipo. A continuación encontrarás tus credenciales
                de acceso a la plataforma Emplix, donde podrás gestionar tus solicitudes,
                documentos y mucho más.
              </p>

              <!-- Credentials box -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:22px 26px;margin-bottom:24px;">
                <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.07em;">
                  Tus credenciales de acceso
                </p>

                <div style="margin-bottom:16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                    Correo corporativo (usuario)
                  </p>
                  <p style="margin:0;font-size:17px;font-weight:700;color:#111827;font-family:'Courier New',Courier,monospace;">
                    ${p.corporateEmail}
                  </p>
                </div>

                <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                    Contraseña temporal
                  </p>
                  <p style="margin:0;font-size:22px;font-weight:800;color:#7c1d1d;font-family:'Courier New',Courier,monospace;letter-spacing:0.12em;">
                    ${p.tempPassword}
                  </p>
                </div>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 26px;">
                <a href="${p.loginUrl}"
                   style="display:inline-block;background:#7c1d1d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 36px;border-radius:8px;letter-spacing:0.02em;">
                  Ingresar a Emplix
                </a>
              </div>

              <!-- Security note -->
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#713f12;line-height:1.6;">
                  🔒 <strong>Por tu seguridad</strong>, se te pedirá crear una nueva contraseña
                  la primera vez que ingreses. También puedes usar
                  <em>Iniciar sesión con Microsoft</em> si tu cuenta corporativa ya está disponible.
                </p>
              </div>

              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                Si tienes alguna duda, comunícate con el equipo de Recursos Humanos.
                ¡Bienvenido/a a bordo! 🚀
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${year} ${p.companyName} · Emplix HR — Correo generado automáticamente, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Parámetros para el email de bienvenida de candidatos ─────────────────────
export interface CandidateWelcomeEmailParams {
  candidateName: string;
  username:      string;
  password:      string;
  loginUrl:      string;
}

export function buildCandidateWelcomeEmail(p: CandidateWelcomeEmailParams): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#7c1d1d;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">⚡ Emplix</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Plataforma de Gestión de RRHH</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
                Bienvenido/a, ${p.candidateName}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                Recursos Humanos ha generado sus credenciales de acceso a la plataforma
                de reclutamiento. A continuación encontrará sus datos de ingreso.
              </p>

              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">
                  Credenciales de acceso
                </p>

                <div style="margin-bottom:14px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Usuario</p>
                  <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:'Courier New',Courier,monospace;letter-spacing:0.06em;">
                    ${p.username}
                  </p>
                </div>

                <div style="border-top:1px solid #e5e7eb;padding-top:14px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Contraseña temporal</p>
                  <p style="margin:0;font-size:20px;font-weight:700;color:#7c1d1d;font-family:'Courier New',Courier,monospace;letter-spacing:0.1em;">
                    ${p.password}
                  </p>
                </div>
              </div>

              <div style="text-align:center;margin:0 0 24px;">
                <a href="${p.loginUrl}"
                   style="display:inline-block;background:#7c1d1d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  Ingresar a la plataforma
                </a>
              </div>

              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:12px 16px;">
                <p style="margin:0;font-size:13px;color:#713f12;line-height:1.5;">
                  🔒 Por seguridad, le recomendamos cambiar su contraseña luego del primer ingreso.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${year} Emplix HR · Correo generado automáticamente, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetEmail(resetUrl: string, expiresInMinutes = 15): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#7c1d1d;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">⚡ Emplix</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Plataforma de Gestión de RRHH</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Recupera tu contraseña</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Si fuiste tú, haz clic en el botón a continuación:
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#7c1d1d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  Restablecer contraseña
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                Este enlace expira en <strong>${expiresInMinutes} minutos</strong> y es de un solo uso.
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
                Si no solicitaste el restablecimiento, ignora este correo. Tu contraseña no cambiará.
              </p>

              <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br>
                  <a href="${resetUrl}" style="color:#7c1d1d;word-break:break-all;">${resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} Emplix HR · Correo generado automáticamente, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
