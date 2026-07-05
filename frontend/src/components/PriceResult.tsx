import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { PredictResponse } from "../types"

function formatRupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN")
}

interface Props {
  result: PredictResponse
}

export function PriceResult({ result }: Props) {
  const { price_low, price_median, price_high, specs_used, similar_listings } = result

  const chartData = similar_listings.map((l) => ({
    label: `${l.name} (${l.year})`,
    price: l.selling_price,
  }))

  return (
    <div className="price-result">
      <div className="price-range-card">
        <h2>Estimated Price Range</h2>
        <div className="price-range-value">
          {formatRupees(price_low)} &ndash; {formatRupees(price_high)}
        </div>
        <div className="price-median">Median estimate: {formatRupees(price_median)}</div>
        <p className="disclaimer">
          This is a data-driven estimate from historical sale prices, not an appraisal —
          actual condition, accident history, and local market demand can shift the real
          price outside this range.
        </p>
      </div>

      <div className="specs-card">
        <h3>Specs used for this estimate</h3>
        <p className="hint">
          Auto-filled from this model's typical factory specs — you didn't need to know these.
        </p>
        <ul>
          <li>Mileage: {specs_used.mileage_kmpl} kmpl</li>
          <li>Engine: {specs_used.engine_cc} CC</li>
          <li>Max power: {specs_used.max_power_bhp} bhp</li>
          <li>Torque: {specs_used.torque_nm} Nm</li>
          <li>Seats: {specs_used.seats}</li>
        </ul>
      </div>

      {similar_listings.length > 0 && (
        <div className="similar-card">
          <h3>Similar real cars sold</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, similar_listings.length * 45)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatRupees(v)} />
              <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#14b881" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="table-scroll">
            <table className="similar-table">
              <thead>
                <tr>
                  <th>Model</th><th>Year</th><th>KM</th><th>Fuel</th><th>Owner</th><th>Sold for</th>
                </tr>
              </thead>
              <tbody>
                {similar_listings.map((l, i) => (
                  <tr key={i}>
                    <td>{l.name}</td>
                    <td>{l.year}</td>
                    <td>{l.km_driven.toLocaleString("en-IN")}</td>
                    <td>{l.fuel}</td>
                    <td>{l.owner}</td>
                    <td>{formatRupees(l.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
