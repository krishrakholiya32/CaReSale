import { useState } from "react"
import { CarForm } from "./components/CarForm"
import { PriceResult } from "./components/PriceResult"
import { predictPrice } from "./api/client"
import type { PredictRequest, PredictResponse } from "./types"
import "./App.css"

function App() {
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (req: PredictRequest) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await predictPrice(req)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header>
        <h1>CaReSale</h1>
        <p>Know what your car is really worth before you sell it.</p>
      </header>

      <main>
        <CarForm
          onSubmit={handleSubmit}
          loading={loading}
          onClear={() => {
            setResult(null)
            setError(null)
          }}
        />
        {error && <p className="error">{error}</p>}
        {result && <PriceResult result={result} />}
      </main>
    </div>
  )
}

export default App
