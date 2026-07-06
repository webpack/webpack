"use strict";

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = () => ({
	target: "node14",
	output: { filename: "bundle.mjs", module: true },
	experiments: { outputModule: true },
	externalsType: "module",
	// Consume each built library as a real external ESM module so the emitted
	// `export { ... }` statements are exercised natively (live bindings).
	externals: {
		"lib-single": "../module-live-bindings-0-create/single/lib.mjs",
		"lib-single-prod": "../module-live-bindings-0-create/single-prod/lib.mjs",
		"lib-runtime": "../module-live-bindings-0-create/runtime/main.mjs",
		"lib-runtime-prod": "../module-live-bindings-0-create/runtime-prod/main.mjs"
	}
});
