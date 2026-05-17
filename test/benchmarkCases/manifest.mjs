/** @typedef {"dev-cold" | "prod-cold" | "dev-rebuild" | "filesystem-cache-warm"} ScenarioName */

const DEV_AND_REBUILD = /** @type {ScenarioName[]} */ ([
	"dev-cold",
	"dev-rebuild"
]);
const FULL_SCENARIOS = /** @type {ScenarioName[]} */ ([
	"dev-cold",
	"prod-cold",
	"dev-rebuild"
]);
const PROD_ONLY = /** @type {ScenarioName[]} */ (["prod-cold"]);

/** @type {Record<string, ScenarioName[]>} */
const manifest = {
	"asset-modules-bytes": DEV_AND_REBUILD,
	"asset-modules-inline": DEV_AND_REBUILD,
	"asset-modules-resource": DEV_AND_REBUILD,
	"asset-modules-source": DEV_AND_REBUILD,
	"cache-filesystem": ["filesystem-cache-warm"],
	"concatenate-modules": PROD_ONLY,
	"context-commonjs": DEV_AND_REBUILD,
	"context-esm": DEV_AND_REBUILD,
	"css-modules": DEV_AND_REBUILD,
	"devtool-eval": DEV_AND_REBUILD,
	"devtool-eval-source-map": DEV_AND_REBUILD,
	"devtool-source-map": DEV_AND_REBUILD,
	"future-defaults": ["dev-cold", "prod-cold"],
	"json-modules": DEV_AND_REBUILD,
	lodash: FULL_SCENARIOS,
	"many-chunks-commonjs": FULL_SCENARIOS,
	"many-chunks-esm": FULL_SCENARIOS,
	"many-modules-commonjs": FULL_SCENARIOS,
	"many-modules-esm": FULL_SCENARIOS,
	react: FULL_SCENARIOS,
	"side-effects-reexport": PROD_ONLY,
	"three-long": PROD_ONLY,
	"typescript-long-on-schedule": PROD_ONLY,
	"wasm-modules-async": DEV_AND_REBUILD,
	"wasm-modules-sync": DEV_AND_REBUILD
};

export default manifest;
