import React, { useMemo, useState } from "react";

function clamp(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function calcOEE(tiempoPlan, tiempoParo, cicloIdeal, piezasTotales, piezasBuenas, factorA, factorB) {
  const tiempoOperacion = Math.max(tiempoPlan - tiempoParo, 0);
  const A = tiempoPlan > 0 ? tiempoOperacion / tiempoPlan : 0;
  const denom = (tiempoOperacion * 60) * (factorA * factorB);
  const P = denom > 0 ? (cicloIdeal * piezasTotales) / denom : 0;
  const Q = piezasTotales > 0 ? piezasBuenas / piezasTotales : 0;
  const OEE = A * P * Q;
  return { A, P, Q, OEE, tiempoOperacion };
}

export default function App() {
  const [tiempoPlan, setTiempoPlan] = useState(480);
  const [tiempoParo, setTiempoParo] = useState(60);
  const [cicloIdeal, setCicloIdeal] = useState(1.5);
  const [piezasTotales, setPiezasTotales] = useState(18000);
  const [piezasBuenas, setPiezasBuenas] = useState(17500);
  const [factorA, setFactorA] = useState(1);
  const [factorB, setFactorB] = useState(1);

  const { A, P, Q, OEE, tiempoOperacion } = useMemo(
    () =>
      calcOEE(
        tiempoPlan,
        tiempoParo,
        cicloIdeal,
        piezasTotales,
        piezasBuenas,
        factorA,
        factorB
      ),
    [tiempoPlan, tiempoParo, cicloIdeal, piezasTotales, piezasBuenas, factorA, factorB]
  );

  const kpis = [
    ["Disponibilidad (A)", A, "Operación / Plan"],
    ["Rendimiento (P)", P, "(Ciclo ideal × Pzas) / (Operación × 60)"],
    ["Calidad (Q)", Q, "Buenas / Totales"],
    ["OEE", OEE, "A × P × Q"],
    ["Tiempo Operación (min)", tiempoOperacion, "Plan − Paros"]
  ];

  const color = v => (v >= 0.85 ? "ok" : v >= 0.6 ? "mid" : "bad");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <img src="/brandatta_logo.png" className="logo" />
        <h3>Parámetros</h3>

        <label>Tiempo planificado (min)
          <input type="number" value={tiempoPlan} onChange={e => setTiempoPlan(clamp(e.target.value))} />
        </label>

        <label>Tiempo de paros (min)
          <input type="number" value={tiempoParo} onChange={e => setTiempoParo(clamp(e.target.value))} />
        </label>

        <label>Ciclo ideal (seg/un)
          <input type="number" value={cicloIdeal} onChange={e => setCicloIdeal(clamp(e.target.value))} />
        </label>

        <label>Piezas totales
          <input type="number" value={piezasTotales} onChange={e => setPiezasTotales(clamp(e.target.value))} />
        </label>

        <label>Piezas aprobadas
          <input type="number" value={piezasBuenas} onChange={e => setPiezasBuenas(clamp(e.target.value))} />
        </label>

        <label className="highlight">Factor Operativo A
          <input type="number" value={factorA} onChange={e => setFactorA(clamp(e.target.value))} />
        </label>

        <label className="highlight">Factor Operativo B
          <input type="number" value={factorB} onChange={e => setFactorB(clamp(e.target.value))} />
        </label>
      </aside>

      <main>
        <h1>Calculadora de OEE</h1>

        <div className="kpi-grid">
          {kpis.map(([n, v, d]) => (
            <div key={n} className="kpi-card">
              <div className="kpi-title">{n}</div>
              <div className={`kpi-value ${n.includes("Tiempo") ? "bad" : color(v)}`}>
                {n.includes("Tiempo") ? v.toFixed(2) : (v * 100).toFixed(2) + "%"}
              </div>
              <div className="small-muted">{d}</div>
            </div>
          ))}
        </div>

        <div className="note">
          <b>OEE = A × P × Q</b>
        </div>

        <div className="footer">
          © {new Date().getFullYear()} — Brandatta
        </div>
      </main>
    </div>
  );
}
