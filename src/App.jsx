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
  // FO1 y FO2 ajustan la CAPACIDAD IDEAL => se aplican en el denominador
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
        <button type="button" className="s-btn" onClick={() => setVal(value - step)}>−</button>
        <button type="button" className="s-btn" onClick={() => setVal(value + step)}>+</button>
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

export default function App() {
  const [tiempoPlan, setTiempoPlan] = useState(480);
  const [tiempoParo, setTiempoParo] = useState(60);

  // Antes: cicloIdeal seg/un
  // Ahora: unidades ideales dentro del tiempo planificado (unid)
  const [unidadesIdealEnTP, setUnidadesIdealEnTP] = useState(600);

  const [piezasTotales, setPiezasTotales] = useState(18000);
  const [piezasBuenas, setPiezasBuenas] = useState(17500);

  // FO1/FO2 ajustan la capacidad ideal (denominador)
  const [fo1, setFo1] = useState(1.0);
  const [fo2, setFo2] = useState(1.0);

  const [capAt100, setCapAt100] = useState(true);

  const warnings = useMemo(() => {
    const w = [];
    if (tiempoPlan === 0) w.push("El Tiempo planificado es 0. No se puede calcular Disponibilidad.");
    if (tiempoPlan > 0 && tiempoParo > tiempoPlan) w.push("Los Paros su
