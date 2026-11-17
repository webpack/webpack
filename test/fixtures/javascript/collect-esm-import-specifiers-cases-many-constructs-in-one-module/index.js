#!/usr/bin/env node
import a, { "c" as b } from "./a"; // import "./nope"
/* export * from "./nope" */ export * as ns from "./b";
const r = /['"`]/g.test(a) / 2;
const t = `${{ x: "}" }.x}${`${import("./c")}`}`;
if (a) /"/.test(b);
export { d } from "./d" with { type: "json" };
const f = async () => (await import("./e")).default;
export default class { import() {} export() {} }