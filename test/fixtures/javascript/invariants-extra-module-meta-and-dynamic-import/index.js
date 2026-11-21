export const url = import.meta.url;

export function load(flag) {
  if (!flag) return null;
  return import("./dep.js").then((mod) => mod.default || mod.named);
}

export const ready = Promise.resolve(true);
