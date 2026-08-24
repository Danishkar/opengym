import { useSyncExternalStore } from 'react'
import {
  LANGS, INSTR_LANGS, DATE_LOCALES,
  getLang, dateLocale, t, instrFor, getVersion, _setLangState
} from './i18n-core.js'

export { LANGS, INSTR_LANGS, DATE_LOCALES, getLang, dateLocale, t, instrFor }

async function loadLocale(l) {
  switch (l) {
    case 'de': return (await import('../locales/de.js')).default
    case 'es': return (await import('../locales/es.js')).default
    case 'fr': return (await import('../locales/fr.js')).default
    case 'hi': return (await import('../locales/hi.js')).default
    case 'it': return (await import('../locales/it.js')).default
    case 'ko': return (await import('../locales/ko.js')).default
    case 'pl': return (await import('../locales/pl.js')).default
    case 'pt': return (await import('../locales/pt.js')).default
    case 'ru': return (await import('../locales/ru.js')).default
    case 'tr': return (await import('../locales/tr.js')).default
    case 'zh': return (await import('../locales/zh.js')).default
    default: return {}
  }
}

async function loadInstr(l) {
  switch (l) {
    case 'es': return (await import('../instr/es.js')).default
    case 'fr': return (await import('../instr/fr.js')).default
    case 'hi': return (await import('../instr/hi.js')).default
    case 'it': return (await import('../instr/it.js')).default
    case 'ko': return (await import('../instr/ko.js')).default
    case 'pl': return (await import('../instr/pl.js')).default
    case 'ru': return (await import('../instr/ru.js')).default
    case 'tr': return (await import('../instr/tr.js')).default
    case 'zh': return (await import('../instr/zh.js')).default
    default: return null
  }
}

const subs = new Set()
const notify = () => { subs.forEach(f => f()) }

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  if (l === getLang() && getVersion() > 0) return
  let dict = {}, instr = null
  try {
    dict = l === 'en' ? {} : await loadLocale(l)
    instr = l === 'en' || !INSTR_LANGS.includes(l) ? null : await loadInstr(l)
  } catch (e) { dict = {}; instr = null }
  _setLangState(l, dict, instr)
  notify()
}

export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, getVersion)
}
