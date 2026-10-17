import zhCN from '../locales/zh-CN.json';
import enUS from '../locales/en-US.json';

const dictionaries = {'zh-CN': zhCN, 'en-US': enUS};
const fallback = 'zh-CN';

function detect() {
  const stored = globalThis.localStorage?.getItem('markdeck.locale');
  if (stored && dictionaries[stored]) return stored;
  const nav = globalThis.navigator?.language || fallback;
  if (dictionaries[nav]) return nav;
  const base = nav.split('-')[0];
  for (const code of Object.keys(dictionaries)) if (code.startsWith(base + '-')) return code;
  return fallback;
}

let current = detect();

export function getLocale() { return current; }

export function setLocale(code) {
  if (!dictionaries[code]) throw new Error(`unknown locale: ${code}`);
  current = code;
  globalThis.localStorage?.setItem('markdeck.locale', code);
  window.dispatchEvent(new CustomEvent('markdeck-locale', {detail: code}));
}

export function t(key, params) {
  const dict = dictionaries[current] || dictionaries[fallback];
  const value = dict[key] ?? dictionaries[fallback][key] ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export function toastUiLocale() {
  // Toast UI uses lowercase hyphenated keys.
  return current.toLowerCase();
}
