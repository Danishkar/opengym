// Demo build (VITE_DEMO=1) — what runs on the GitHub Pages deployment.
const getEnv = () => {
  try {
    if (typeof process !== 'undefined' && process.env) return process.env
  } catch {}
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env
  } catch {}
  return {}
}
const env = getEnv()
export const DEMO = env.VITE_DEMO === '1' || env.NEXT_PUBLIC_DEMO === '1'
export const DEMO_SEEDED = 'gym_demo_seeded_v1'
export const REPO = 'https://gitlab.com/DuarteSantos8/opengym'
