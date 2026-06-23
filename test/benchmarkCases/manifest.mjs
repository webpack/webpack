/** @typedef {"dev-cold" | "prod-cold" | "dev-rebuild" | "filesystem-cache-warm"} ScenarioName */

// Every case runs every scenario. Limiting cases to a subset of scenarios has
// caused us to miss performance degradations in the past, so the manifest only
// decides which cases exist, not which scenarios they measure.
const ALL_SCENARIOS = /** @type {ScenarioName[]} */ ([
	"dev-cold",
	"prod-cold",
	"dev-rebuild",
	"filesystem-cache-warm"
]);

/** @type {Record<string, ScenarioName[]>} */
const manifest = {
	"asset-modules-bytes": ALL_SCENARIOS,
	"asset-modules-inline": ALL_SCENARIOS,
	"asset-modules-resource": ALL_SCENARIOS,
	"asset-modules-source": ALL_SCENARIOS,
	"cache-filesystem": ALL_SCENARIOS,
	"concatenate-modules": ALL_SCENARIOS,
	"context-commonjs": ALL_SCENARIOS,
	"context-esm": ALL_SCENARIOS,
	"css-modules": ALL_SCENARIOS,
	"devtool-eval": ALL_SCENARIOS,
	"devtool-eval-source-map": ALL_SCENARIOS,
	"devtool-source-map": ALL_SCENARIOS,
	"future-defaults": ALL_SCENARIOS,
	"json-modules": ALL_SCENARIOS,
	lodash: ALL_SCENARIOS,
	"many-chunks-commonjs": ALL_SCENARIOS,
	"many-chunks-esm": ALL_SCENARIOS,
	"many-modules-commonjs": ALL_SCENARIOS,
	"many-modules-esm": ALL_SCENARIOS,
	react: ALL_SCENARIOS,
	"side-effects-reexport": ALL_SCENARIOS,
	"three-long": ALL_SCENARIOS,
	"typescript-long-on-schedule": ALL_SCENARIOS,
	"wasm-modules-async": ALL_SCENARIOS,
	"wasm-modules-sync": ALL_SCENARIOS
};

export default manifest;
