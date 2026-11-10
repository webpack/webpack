export let results = [];

export function trackA() { results.push("a"); }
export function trackB() { results.push("b"); }
export function trackC() { results.push("c"); }
export function trackWasm(number) { results.push("wasm" + number); }

Promise.resolve().then(() => results.push("tick"));
