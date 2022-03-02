export { default } from "./esm-dep.mjs";
// prettier-ignore
import './esm-dep.mjs';

export const asyncDep = (
	await import("../../js/buildDepsInput/esm-async-dependency.mjs")
).default;
// prettier-ignore
await import('../../js/buildDepsInput/esm-async-dependency.mjs')
