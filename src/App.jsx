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
  cicloIdealSegUn,
  piezasTotales,
  piezasBuenas,
  fo1,
  fo2,
  capAt100,
}) {
  const tp = clampNumber(tiempoPlan);
  const tparo = clampNumber(tiempoParo);
  const ci = clampNumber(cicloIdealSegUn);
  const pt = Math.max(0, Math.floor(clampNumber(piezasTotales)));
  const pb = Math.max(0, Math.floor(clampNumber(piezasBuenas)));
  const f1 = clampNumber(fo1);
  const f2 = clampNumber(fo2);

  const tiempoOperacion = Math.max(tp - tparo, 0);

  const A_raw = tp > 0 ? tiempoOperacion / tp : 0;

  // Streamlit: P = [(Ciclo ideal × Pzas) × (FO1 × FO2)] / (Tiempo operación × 60)
  const denom = tiempoOperacion * 60;
  const numer = (ci * pt) * (f1 * f2);
  const P_raw = denom > 0 ? numer / denom : 0;

  const Q_raw = pt > 0 ? pb / pt : 0;

  const OEE_raw = A_raw * P_raw * Q_raw;

  if (capAt100) {
    const A = clamp01(A_raw);
    const P = clamp01(P_raw);
    const Q = clamp01(Q_raw);
    const OEE = clamp01(A * P * Q);
    return { A, P, Q, OEE, tiempoOperacion, A_raw, P_raw, Q_raw, OEE_raw };
  }

  return { A: A_raw, P: P_raw, Q: Q_raw, OEE: OEE_raw, tiempoOperacion, A_raw, P_raw, Q_raw, OEE_raw };
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

// Stepper con -/+ (parecido a Streamlit)
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
        <button type="button" className="s-btn" onClick={() => setVal(clampNumber(value) - step)} aria-label={`- ${label}`}>
          −
        </button>
        <button type="button" className="s-btn" onClick={() => setVal(clampNumber(value) + step)} aria-label={`+ ${label}`}>
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
      {text.split("\n").map((line, idx) => (
        <div key={idx}>{line}</div>
      ))}
    </div>
  );
}

export default function App() {
  const [tiempoPlan, setTiempoPlan] = useState(480.0);
  const [tiempoParo, setTiempoParo] = useState(60.0);
  const [cicloIdeal, setCicloIdeal] = useState(1.5);
  const [piezasTotales, setPiezasTotales] = useState(18000);
  const [piezasBuenas, setPiezasBuenas] = useState(17500);
  const [fo1, setFo1] = useState(1.0);
  const [fo2, setFo2] = useState(1.0);
  const [capAt100, setCapAt100] = useState(true);

  const warnings = useMemo(() => {
    const w = [];
    if (tiempoPlan === 0) w.push("El Tiempo planificado es 0. No se puede calcular Disponibilidad.");
    if (tiempoPlan > 0 && tiempoParo > tiempoPlan) w.push("Los Paros superan el Tiempo planificado. Revisá la carga de datos.");
    if (piezasTotales > 0 && piezasBuenas > piezasTotales) w.push("Las Piezas de Calidad Aprobada superan las Piezas totales. Revisá la carga.");
    if (cicloIdeal === 0 && piezasTotales > 0) w.push("El Ciclo ideal es 0. Rendimiento quedará en 0 (revisá el dato).");
    return w;
  }, [tiempoPlan, tiempoParo, piezasTotales, piezasBuenas, cicloIdeal]);

  const { A, P, Q, OEE, tiempoOperacion, A_raw, P_raw, Q_raw, OEE_raw } = useMemo(() => {
    return calcOEE({
      tiempoPlan,
      tiempoParo,
      cicloIdealSegUn: cicloIdeal,
      piezasTotales,
      piezasBuenas,
      fo1,
      fo2,
      capAt100,
    });
  }, [tiempoPlan, tiempoParo, cicloIdeal, piezasTotales, piezasBuenas, fo1, fo2, capAt100]);

  const audit = useMemo(() => {
    if (!capAt100) return null;
    const over = [];
    if (A_raw > 1) over.push(`Disponibilidad sin cap: ${(A_raw * 100).toFixed(2)}%`);
    if (P_raw > 1) over.push(`Rendimiento sin cap: ${(P_raw * 100).toFixed(2)}%`);
    if (Q_raw > 1) over.push(`Calidad sin cap: ${(Q_raw * 100).toFixed(2)}%`);
    if (OEE_raw > 1) over.push(`OEE sin cap: ${(OEE_raw * 100).toFixed(2)}%`);
    if (!over.length) return null;

    return (
      "Algunas métricas superan 100% con los datos ingresados. Se aplicó Cap a 100% para lectura operativa.\n" +
      "Valores sin Cap:\n- " +
      over.join("\n- ");
  }, [capAt100, A_raw, P_raw, Q_raw, OEE_raw]);

  const year = new Date().getFullYear();

  const kpis = [
    { name: "Disponibilidad (A)", val: A, desc: "Operación / Plan" },
    { name: "Rendimiento (P)", val: P, desc: "[(Ciclo ideal × Pzas) × (FO1 × FO2)] / (Operación × 60)" },
    { name: "Calidad (Q)", val: Q, desc: "Buenas / Totales" },
    { name: "OEE", val: OEE, desc: "A × P × Q" },
    { name: "Tiempo Operación (min)", val: tiempoOperacion, desc: "Plan − Paros", isTime: true },
  ];

  return (
    <div className="s-shell">
      <aside className="s-sidebar">
        <div className="s-logo-row">
          <img
            src="/brandatta_logo.png"
            alt="Brandatta"
            className="s-logo"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <div className="s-sidebar-title">Parámetros</div>

        <Stepper label="Tiempo Planificado (min)" value={tiempoPlan} onChange={setTiempoPlan} step={1} min={0} />
        <Stepper label="Paradas Registradas (min)" value={tiempoParo} onChange={setTiempoParo} step={1} min={0} />
        <Stepper label="Ciclo Ideal Nominal (seg/un)" value={cicloIdeal} onChange={setCicloIdeal} step={0.1} min={0} />
        <Stepper label="Piezas Totales" value={piezasTotales} onChange={setPiezasTotales} step={100} min={0} isInt />
        <Stepper label="Piezas de Calidad Aprobada" value={piezasBuenas} onChange={setPiezasBuenas} step={100} min={0} isInt />

        <Stepper label="Factor Operativo FO1" value={fo1} onChange={setFo1} step={0.1} min={0.1} highlight />
        <Stepper label="Factor Operativo FO2" value={fo2} onChange={setFo2} step={0.1} min={0.1} highlight />

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
        <p className="s-subtitle">
          Mide <b>Disponibilidad (A)</b>, <b>Rendimiento (P)</b>, <b>Calidad (Q)</b> y <b>Factores Operativos (FO1 y FO2)</b>{" "}
          para obtener el OEE de la línea de producción. En esta versión, <b>FO1 y FO2 ajustan el Rendimiento (P)</b> (si FO &lt; 1,
          penaliza; si FO &gt; 1, mejora).
        </p>

        <div className="s-kpi-grid">
          {kpis.map((k) => (
            <div key={k.name} className="kpi-card">
              <div className="kpi-title">{k.name}</div>
              <div className={`kpi-value ${k.isTime ? "ok" : kpiColor(k.val)}`}>
                {k.isTime ? num2(k.val) : pct(k.val)}
              </div>
              <div className="small-muted">{k.desc}</div>
            </div>
          ))}
        </div>

        {audit && <InfoBox text={audit} />}

        <h2 className="s-h2">Conceptos</h2>

        <div className="formula">
          <b>Disponibilidad (A)</b> = Tiempo de operación / Tiempo planificado
        </div>
        <div className="formula">
          <b>Rendimiento (P)</b> = [(Ciclo ideal × Piezas totales) × (FO1 × FO2)] / (Tiempo de operación × 60)
        </div>
        <div className="formula">
          <b>Calidad (Q)</b> = Piezas de Calidad Aprobada / Piezas totales
        </div>
        <div className="formula">
          <b>Factores Operativos (FO1 y FO2)</b> = Ajustes operativos que impactan el cálculo de <b>Rendimiento (P)</b> (FO &lt; 1
          penaliza; FO &gt; 1 mejora).
        </div>

        <div className="note">
          <b>OEE = A × P × Q</b>
        </div>

        <div className="s-footer">© {year} — Brandatta • Calculadora OEE</div>
      </main>
    </div>
  );
}
