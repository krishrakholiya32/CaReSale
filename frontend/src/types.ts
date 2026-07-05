export interface PredictRequest {
  name: string
  year: number
  km_driven: number
  fuel: string
  seller_type: string
  transmission: string
  owner: string
  seats?: number
}

export interface SimilarListing {
  name: string
  year: number
  km_driven: number
  fuel: string
  transmission: string
  owner: string
  selling_price: number
}

export interface PredictResponse {
  price_low: number
  price_median: number
  price_high: number
  specs_used: {
    mileage_kmpl: number
    engine_cc: number
    max_power_bhp: number
    torque_nm: number
    seats: number
  }
  car_age: number
  similar_listings: SimilarListing[]
}
