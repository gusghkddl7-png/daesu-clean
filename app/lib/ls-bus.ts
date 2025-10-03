const BUS_EVENT = "daesu:dataChanged";

export function readLS<T = any>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLS(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } finally {
    window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: { key } }));
  }
}

export function onDataChanged(handler: (key: string) => void) {
  const fn = (e: Event) => {
    const key = (e as CustomEvent).detail?.key;
    if (key) handler(key);
  };
  window.addEventListener(BUS_EVENT, fn);
  return () => window.removeEventListener(BUS_EVENT, fn);
}
