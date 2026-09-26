export interface FilterSettings {
  temperature: number   // -100 to 100
  hue: number           // -100 to 100
  saturation: number    // -100 to 100
  brightness: number    // -100 to 100
  contrast: number      // -100 to 100
  highlight: number     // -100 to 100
  shadow: number        // -100 to 100
  illumination: number  // -100 to 100
  sharpen: number       // 0 to 100
  particles: number     // 0 to 100
  fade: number          // 0 to 100
  vignette: number      // 0 to 100
}

export interface FilterPreset {
  id: string
  name: string
  filters: FilterSettings
}

export const DEFAULT_FILTERS: FilterSettings = {
  temperature: 0,
  hue: -18,
  saturation: -50,
  brightness: -31,
  contrast: 20,
  highlight: -10,
  shadow: -10,
  illumination: -10,
  sharpen: 8,
  particles: 7,
  fade: 5,
  vignette: 50,
}

export const RESET_FILTERS: FilterSettings = {
  temperature: 0,
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  highlight: 0,
  shadow: 0,
  illumination: 0,
  sharpen: 0,
  particles: 0,
  fade: 0,
  vignette: 0,
}
