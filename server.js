const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json({ limit: "200kb" }));

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const SMTP_HOST = mustEnv("SES_SMTP_HOST"); // email-smtp.us-east-2.amazonaws.com
const SMTP_PORT = Number(process.env.SES_SMTP_PORT || 587);
const SMTP_USER = mustEnv("SES_SMTP_USER");
const SMTP_PASS = mustEnv("SES_SMTP_PASS");

const FROM_EMAIL = mustEnv("FROM_EMAIL"); // ej: no-reply@brandatta.com.ar
const TO_EMAIL = process.env.TO_EMAIL || "sebastian@brandatta.com.ar";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 587 => false (STARTTLS)
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/contact", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const empresa = String(req.body?.empresa || "").trim();
    const rol = String(req.body?.rol || "").trim();
    const consulta = String(req.body?.consulta || "").trim();

    if (!nombre || !empresa || !rol || !consulta) {
      return res.status(400).json({ ok: false, error: "Faltan campos requeridos." });
    }

    const subject = `Consulta - Calculadora OEE (${empresa})`;
    const text =
`Nombre: ${nombre}
Empresa: ${empresa}
Rol: ${rol}

Consulta:
${consulta}
`;

    await transporter.sendMail({
      from: `Calculadora OEE <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      subject,
      text
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("SENDMAIL_ERROR:", err);
    return res.status(500).json({ ok: false, error: "Error enviando el correo." });
  }
});

const PORT = Number(process.env.CONTACT_PORT || 3000);
app.listen(PORT, () => console.log(`Contact server listening on :${PORT}`));
