import { useEffect, useState } from "react"
import type { PredictRequest } from "../types"
import { fetchBrands, searchModels } from "../api/client"

const FUEL_OPTIONS = ["Petrol", "Diesel", "CNG", "LPG", "Electric"]
const SELLER_OPTIONS = ["Individual", "Dealer", "Trustmark Dealer"]
const TRANSMISSION_OPTIONS = ["Manual", "Automatic"]
const OWNER_OPTIONS = ["First Owner", "Second Owner", "Third Owner", "Fourth & Above Owner", "Test Drive Car"]

interface Props {
  onSubmit: (req: PredictRequest) => void
  loading: boolean
}

export function CarForm({ onSubmit, loading }: Props) {
  const [brands, setBrands] = useState<string[]>([])
  const [brand, setBrand] = useState("")
  const [modelQuery, setModelQuery] = useState("")
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [year, setYear] = useState(2018)
  const [kmDriven, setKmDriven] = useState(50000)
  const [fuel, setFuel] = useState(FUEL_OPTIONS[0])
  const [sellerType, setSellerType] = useState(SELLER_OPTIONS[0])
  const [transmission, setTransmission] = useState(TRANSMISSION_OPTIONS[0])
  const [owner, setOwner] = useState(OWNER_OPTIONS[0])

  useEffect(() => {
    fetchBrands().then(setBrands).catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    if (modelQuery.trim().length < 2) {
      setModelOptions([])
      return
    }
    const timeout = setTimeout(() => {
      searchModels(modelQuery, brand || undefined)
        .then(setModelOptions)
        .catch(() => setModelOptions([]))
    }, 250)
    return () => clearTimeout(timeout)
  }, [modelQuery, brand])

  const canSubmit = selectedModel.trim().length > 0 && year > 1990 && kmDriven >= 0

  return (
    <form
      className="car-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          name: selectedModel,
          year,
          km_driven: kmDriven,
          fuel,
          seller_type: sellerType,
          transmission,
          owner,
        })
      }}
    >
      <div className="field">
        <label>Brand</label>
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Any brand</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Car model</label>
        <input
          type="text"
          placeholder="Start typing e.g. Swift, i20, Baleno..."
          value={selectedModel || modelQuery}
          onChange={(e) => {
            setSelectedModel("")
            setModelQuery(e.target.value)
          }}
        />
        {modelOptions.length > 0 && !selectedModel && (
          <ul className="model-suggestions">
            {modelOptions.map((m) => (
              <li
                key={m}
                onClick={() => {
                  setSelectedModel(m)
                  setModelOptions([])
                }}
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label>Manufacturing year</label>
          <input
            type="number"
            min={1990}
            max={2030}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Kilometers driven</label>
          <input
            type="number"
            min={0}
            value={kmDriven}
            onChange={(e) => setKmDriven(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Fuel type</label>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
            {FUEL_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Transmission</label>
          <select value={transmission} onChange={(e) => setTransmission(e.target.value)}>
            {TRANSMISSION_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Owner</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Seller type</label>
          <select value={sellerType} onChange={(e) => setSellerType(e.target.value)}>
            {SELLER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <button type="submit" disabled={!canSubmit || loading}>
        {loading ? "Estimating..." : "Get Price Estimate"}
      </button>
      {!selectedModel && modelQuery.trim().length > 0 && modelOptions.length === 0 && (
        <p className="hint">Pick a model from the suggestions above to continue.</p>
      )}
    </form>
  )
}
