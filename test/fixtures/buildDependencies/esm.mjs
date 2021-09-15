export { default } from "./esm-dep.mjs";

export const asyncDep = (
	await import("../../js/buildDepsInput/esm-async-dependency.mjs")
).default;
