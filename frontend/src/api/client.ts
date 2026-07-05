import type { PredictRequest, PredictResponse } from "../types"

// Derive the backend host from wherever the page itself was loaded from (localhost,
// LAN IP, or a real domain), instead of hardcoding "localhost" — otherwise this breaks
// the moment the app is opened from a phone or any other device on the network.
const BASE = import.meta.env.VITE_API_URL != null
  ? import.meta.env.VITE_API_URL
  : `${window.location.protocol}//${window.location.hostname}:8100/api`

export async function fetchBrands(): Promise<string[]> {
  const res = await fetch(`${BASE}/brands`)
  if (!res.ok) throw new Error("Failed to load brands")
  return res.json()
}

export async function searchModels(query: string, brand?: string): Promise<string[]> {
  const params = new URLSearchParams({ q: query })
  if (brand) params.set("brand", brand)
  const res = await fetch(`${BASE}/models?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to search models")
  return res.json()
}

export async function predictPrice(req: PredictRequest): Promise<PredictResponse> {
  const res = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Prediction failed: ${body}`)
  }
  return res.json()
}
