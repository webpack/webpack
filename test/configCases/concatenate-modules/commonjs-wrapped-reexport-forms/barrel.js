// reached only through a whole-object require(), so this barrel is wrapped
// and every re-export renders as runtime code over the wrapper accessors
export { bump, count, value as esmValue } from "./esm-member.js";
export * as esmNs from "./esm-member.js";
export * from "./esm-star.js";
export * as dynNs from "./dynamic-cjs.js";
export * from "./dynamic-cjs.js";
export { default as jsonDefault } from "./data.json";
export { default as htmlDefault } from "./page.html";
