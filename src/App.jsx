// src/App.jsx
import React, { useMemo, useState } from "react";

function clampNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function clamp01(x) {
  const n = clampNumber(x);
  return Math.max(0, Math.min(n, 1));
}

function calcOEE({
  tiempoPlan,
  tiempoParo,
  unidadesIdealEnTP, // Unidades ideales dentro del tiempo planificado (unid)
  piezasTotales,
  piezasBuenas,
  fo1,
  fo2,
  capAt100,
}) {
  const tp = clampNumber(tiempoPlan);
  const tparo = clampNumber(tiempoParo);
  const uIdealTP = clampNumber(unidadesIdealEnTP);

  const pt = Math.max(0, Math.floor(clampNumber(piezasTotales)));
  const pb = Math.max(0, Math.floor(clampNumber(piezasBuenas)));

  const f1 = clampNumber(fo1);
  const f2 = clampNumber(fo2);

  const tiempoOperacion = Math.max(tp - tparo, 0);

  // Disponibilidad
  const A_raw = tp > 0 ? tiempoOperacion / tp : 0;

  // Rendimiento (P)
  // tasa ideal = (unidades ideales en TP) / (tiempo planificado) => unid/min
  // unidades ideales en operación = tasa ideal * tiempoOperacion
  // FO1 y FO2 ajustan la CAPACIDAD IDEAL (como multiplicadores sobre la capacidad ideal)
  const tasaIdealUnidPorMin = tp > 0 ? uIdealTP / tp : 0;
  const unidadesIdealesEnOperacion = tasaIdealUnidPorMin * tiempoOperacion;

  const capacidadIdealAjustada = unidadesIdealesEnOperacion * (f1 * f2);
  const P_raw = capacidadIdealAjustada > 0 ? pt / capacidadIdealAjustada : 0;

  // Calidad
  const Q_raw = pt > 0 ? pb / pt : 0;

  const OEE_raw = A_raw * P_raw * Q_raw;

  if (capAt100) {
    const A = clamp01(A_raw);
    const P = clamp01(P_raw);
    const Q = clamp01(Q_raw);
    const OEE = clamp01(A * P * Q);
    return { A, P, Q, OEE, tiempoOperacion, A_raw, P_raw, Q_raw, OEE_raw };
  }

  return {
    A: A_raw,
    P: P_raw,
    Q: Q_raw,
    OEE: OEE_raw,
    tiempoOperacion,
    A_raw,
    P_raw,
    Q_raw,
    OEE_raw,
  };
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}
function num2(x) {
  return `${x.toFixed(2)}`;
}
function kpiColor(val) {
  if (val >= 0.85) return "ok";
  if (val >= 0.6) return "mid";
  return "bad";
}

function Stepper({ label, value, onChange, step = 1, min = 0, isInt = false, highlight = false }) {
  const setVal = (v) => {
    let n = clampNumber(v);
    if (n < min) n = min;
    if (isInt) n = Math.floor(n);
    onChange(n);
  };

  return (
    <div className={`s-field ${highlight ? "s-highlight" : ""}`}>
      <div className="s-label">{label}</div>
      <div className="s-stepper">
        <input
          className="s-input"
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => setVal(e.target.value)}
        />
        <button type="button" className="s-btn" onClick={() => setVal(value - step)}>
          −
        </button>
        <button type="button" className="s-btn" onClick={() => setVal(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

function SidebarWarning({ text }) {
  return (
    <div className="s-warning">
      <div className="s-warning-icon">!</div>
      <div className="s-warning-text">{text}</div>
    </div>
  );
}

function InfoBox({ text }) {
  return (
    <div className="s-info">
      {text.split("\n").map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function App() {
  // Defaults solicitados
  const [tiempoPlan, setTiempoPlan] = useState(480);
  const [tiempoParo, setTiempoParo] = useState(10);
  const [unidadesIdealEnTP, setUnidadesIdealEnTP] = useState(600);
  const [piezasTotales, setPiezasTotales] = useState(532);
  const [piezasBuenas, setPiezasBuenas] = useState(520);

  // FO1/FO2 ajustan la capacidad ideal
  const [fo1, setFo1] = useState(1.0);
  const [fo2, setFo2] = useState(1.0);

  const [capAt100, setCapAt100] = useState(true);

  // Formulario "Consultas"
  const [cNombre, setCNombre] = useState("");
  const [cEmpresa, setCEmpresa] = useState("");
  const [cEmail, setCEmail] = useState(""); // NUEVO
  const [cRol, setCRol] = useState("");
  const [cConsulta, setCConsulta] = useState("");
  const [cMsg, setCMsg] = useState("");
  const [cSending, setCSending] = useState(false);

  const warnings = useMemo(() => {
    const w = [];
    if (tiempoPlan === 0) w.push("El Tiempo planificado es 0. No se puede calcular Disponibilidad.");
    if (tiempoPlan > 0 && tiempoParo > tiempoPlan) w.push("Los Paros superan el Tiempo planificado.");
    if (piezasTotales > 0 && piezasBuenas > piezasTotales) w.push("Las Piezas buenas superan las totales.");
    if (unidadesIdealEnTP === 0 && piezasTotales > 0) w.push("Las Unidades ideales en el Tiempo planificado son 0.");
    if (fo1 <= 0 || fo2 <= 0) w.push("FO1 y FO2 deben ser mayores a 0.");
    return w;
  }, [tiempoPlan, tiempoParo, piezasTotales, piezasBuenas, unidadesIdealEnTP, fo1, fo2]);

  const { A, P, Q, OEE, tiempoOperacion, A_raw, P_raw, Q_raw, OEE_raw } = useMemo(
    () =>
      calcOEE({
        tiempoPlan,
        tiempoParo,
        unidadesIdealEnTP,
        piezasTotales,
        piezasBuenas,
        fo1,
        fo2,
        capAt100,
      }),
    [tiempoPlan, tiempoParo, unidadesIdealEnTP, piezasTotales, piezasBuenas, fo1, fo2, capAt100]
  );

  const audit = useMemo(() => {
    if (!capAt100) return null;
    const over = [];
    if (A_raw > 1) over.push(`Disponibilidad sin cap: ${(A_raw * 100).toFixed(2)}%`);
    if (P_raw > 1) over.push(`Rendimiento sin cap: ${(P_raw * 100).toFixed(2)}%`);
    if (Q_raw > 1) over.push(`Calidad sin cap: ${(Q_raw * 100).toFixed(2)}%`);
    if (OEE_raw > 1) over.push(`OEE sin cap: ${(OEE_raw * 100).toFixed(2)}%`);
    if (!over.length) return null;
    return "Algunas métricas superan 100%.\nValores sin cap:\n- " + over.join("\n- ");
  }, [capAt100, A_raw, P_raw, Q_raw, OEE_raw]);

  const year = new Date().getFullYear();

  // SUBMIT REAL (backend SES vía /api/contact)
  const onSubmitConsulta = async (e) => {
    e.preventDefault();
    setCMsg("");

    const nombre = (cNombre || "").trim();
    const empresa = (cEmpresa || "").trim();
    const email = (cEmail || "").trim();
    const rol = (cRol || "").trim();
    const consulta = (cConsulta || "").trim();

    if (!nombre || !empresa || !email || !rol || !consulta) {
      setCMsg("Por favor completá Nombre, Empresa, Email, Rol y la Consulta.");
      return;
    }
    if (!isValidEmail(email)) {
      setCMsg("Por favor ingresá un email válido.");
      return;
    }

    try {
      setCSending(true);
      setCMsg("Enviando consulta...");

      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, empresa, email, rol, consulta }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      setCMsg("Consulta enviada. Gracias.");
      setCNombre("");
      setCEmpresa("");
      setCEmail("");
      setCRol("");
      setCConsulta("");
    } catch (err) {
      setCMsg("No se pudo enviar la consulta. Intentá nuevamente.");
    } finally {
      setCSending(false);
    }
  };

  return (
    <div className="s-shell">
      <aside className="s-sidebar">
        <div className="s-logo-row">
          <a href="https://brandatta.com.ar" target="_blank" rel="noopener noreferrer">
            <img
              src="/brandatta_logo.png"
              alt="Brandatta"
              className="s-logo"
              style={{ cursor: "pointer" }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </a>
        </div>

        <div className="s-sidebar-title">Parámetros</div>

        <Stepper label="Tiempo Planificado (min)" value={tiempoPlan} onChange={setTiempoPlan} />
        <Stepper label="Paradas Registradas (min)" value={tiempoParo} onChange={setTiempoParo} />

        <Stepper
          label="Unidades ideales en Tiempo planificado (unid)"
          value={unidadesIdealEnTP}
          onChange={setUnidadesIdealEnTP}
          step={10}
          min={0}
          isInt
        />

        <Stepper label="Piezas Totales" value={piezasTotales} onChange={setPiezasTotales} step={10} isInt />
        <Stepper label="Piezas de Calidad Aprobada" value={piezasBuenas} onChange={setPiezasBuenas} step={10} isInt />

        <Stepper label="Factor Capacidad Ideal FO1" value={fo1} onChange={setFo1} step={0.1} min={0.1} highlight />
        <Stepper label="Factor Capacidad Ideal FO2" value={fo2} onChange={setFo2} step={0.1} min={0.1} highlight />

        <label className="s-toggle">
          <input type="checkbox" checked={capAt100} onChange={(e) => setCapAt100(e.target.checked)} />
          <span>Capear métricas a 100%</span>
        </label>

        {warnings.length > 0 && (
          <div className="s-obs">
            <div className="s-obs-title">Observaciones</div>
            {warnings.map((w, i) => (
              <SidebarWarning key={i} text={w} />
            ))}
          </div>
        )}
      </aside>

      <main className="s-main">
        <h1 className="s-title">Calculadora de OEE</h1>

        <div className="s-kpi-grid">
          {[
            { n: "Disponibilidad (A)", v: A },
            { n: "Rendimiento (P)", v: P },
            { n: "Calidad (Q)", v: Q },
            { n: "OEE", v: OEE },
            { n: "Tiempo Operación (min)", v: tiempoOperacion, t: true },
          ].map((k) => (
            <div key={k.n} className="kpi-card">
              <div className="kpi-title">{k.n}</div>
              <div className={`kpi-value ${k.t ? "ok" : kpiColor(k.v)}`}>{k.t ? num2(k.v) : pct(k.v)}</div>
            </div>
          ))}
        </div>

        {audit && <InfoBox text={audit} />}

        <h2 className="s-h2">Conceptos</h2>
        <div className="formula">
          <b>Disponibilidad (A)</b> = Tiempo de operación / Tiempo planificado
        </div>
        <div className="formula">
          <b>Rendimiento (P)</b> = Piezas totales / Capacidad ideal ajustada
        </div>
        <div className="formula">
          Capacidad ideal ajustada = [(Unidades ideales en tiempo planificado / Tiempo planificado) × Tiempo de operación] × (FO1 × FO2)
        </div>
        <div className="formula">
          <b>Calidad (Q)</b> = Piezas buenas / Piezas totales
        </div>
        <div className="note">
          <b>OEE = A × P × Q</b>
        </div>

        {/* CONSULTAS */}
        <h2 className="s-h2">Consultas</h2>
        <form className="s-contact" onSubmit={onSubmitConsulta}>
          {/* Fila 1: Nombre / Empresa / Email */}
          <div className="s-contact-grid">
            <div className="s-contact-field">
              <label className="s-contact-label">Nombre</label>
              <input
                className="s-contact-input"
                value={cNombre}
                onChange={(e) => setCNombre(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>

            <div className="s-contact-field">
              <label className="s-contact-label">Empresa</label>
              <input
                className="s-contact-input"
                value={cEmpresa}
                onChange={(e) => setCEmpresa(e.target.value)}
                placeholder="Tu empresa"
                autoComplete="organization"
              />
            </div>

            <div className="s-contact-field">
              <label className="s-contact-label">Email</label>
              <input
                className="s-contact-input"
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Rol */}
          <div className="s-contact-field">
            <label className="s-contact-label">Rol</label>
            <input
              className="s-contact-input"
              value={cRol}
              onChange={(e) => setCRol(e.target.value)}
              placeholder="Ej: Jefe de planta, Calidad, Mantenimiento…"
            />
          </div>

          {/* Consulta */}
          <div className="s-contact-field" style={{ marginTop: 12 }}>
            <label className="s-contact-label">Consulta</label>
            <textarea
              className="s-contact-textarea"
              value={cConsulta}
              onChange={(e) => setCConsulta(e.target.value)}
              placeholder="Escribí tu consulta…"
              rows={5}
            />
          </div>

          <div className="s-contact-actions">
            <button className="s-contact-btn" type="submit" disabled={cSending}>
              {cSending ? "Enviando..." : "Enviar consulta"}
            </button>

            {cMsg && <div className="s-contact-msg">{cMsg}</div>}
          </div>
        </form>

        <div className="s-footer">© {year} — Brandatta • Calculadora OEE</div>
      </main>
    </div>
  );
}
