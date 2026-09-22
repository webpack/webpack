"use strict";

const webpack = require("../../lib/index");

// Each scope mirrors the directory its file lives in, so a name that stops
// resolving means `lib/index.js` drifted from the tree. Read through a thunk
// rather than by indexing, which keeps every access precisely typed.
const SCOPED = [
	{ name: "asset.AssetModulesPlugin", read: () => webpack.asset.AssetModulesPlugin },
	{ name: "bun.BunTargetPlugin", read: () => webpack.bun.BunTargetPlugin },
	{ name: "cache.Cache", read: () => webpack.cache.Cache },
	{ name: "config.PlatformPlugin", read: () => webpack.config.PlatformPlugin },
	{ name: "config.WebpackOptionsApply", read: () => webpack.config.WebpackOptionsApply },
	{ name: "config.defineConfig", read: () => webpack.config.defineConfig },
	{ name: "config.validateSchema", read: () => webpack.config.validateSchema },
	{ name: "css.CssLoadingRuntimeModule", read: () => webpack.css.CssLoadingRuntimeModule },
	{ name: "deno.DenoTargetPlugin", read: () => webpack.deno.DenoTargetPlugin },
	{ name: "experiments.typescript.TypeScriptPlugin", read: () => webpack.experiments.typescript.TypeScriptPlugin },
	{ name: "json.JsonModulesPlugin", read: () => webpack.json.JsonModulesPlugin },
	{ name: "optimize.ConcatenationScope", read: () => webpack.optimize.ConcatenationScope },
	{ name: "optimize.OptimizationStages", read: () => webpack.optimize.OptimizationStages },
	{ name: "prefetch.AutomaticPrefetchPlugin", read: () => webpack.prefetch.AutomaticPrefetchPlugin },
	{ name: "prefetch.PrefetchPlugin", read: () => webpack.prefetch.PrefetchPlugin },
	{ name: "runtime.RuntimeGlobals", read: () => webpack.runtime.RuntimeGlobals },
	{ name: "runtime.RuntimeModule", read: () => webpack.runtime.RuntimeModule },
	{ name: "util.RequestShortener", read: () => webpack.util.RequestShortener }
];

// The old path stays reachable and hands back the very same object.
const KEPT_ALIASES = [
	{ from: "Cache", to: "cache.Cache", readFrom: () => webpack.Cache, readTo: () => webpack.cache.Cache },
	{ from: "PlatformPlugin", to: "config.PlatformPlugin", readFrom: () => webpack.PlatformPlugin, readTo: () => webpack.config.PlatformPlugin },
	{ from: "WebpackOptionsApply", to: "config.WebpackOptionsApply", readFrom: () => webpack.WebpackOptionsApply, readTo: () => webpack.config.WebpackOptionsApply },
	{ from: "defineConfig", to: "config.defineConfig", readFrom: () => webpack.defineConfig, readTo: () => webpack.config.defineConfig },
	{ from: "validateSchema", to: "config.validateSchema", readFrom: () => webpack.validateSchema, readTo: () => webpack.config.validateSchema },
	{ from: "ConcatenationScope", to: "optimize.ConcatenationScope", readFrom: () => webpack.ConcatenationScope, readTo: () => webpack.optimize.ConcatenationScope },
	{ from: "OptimizationStages", to: "optimize.OptimizationStages", readFrom: () => webpack.OptimizationStages, readTo: () => webpack.optimize.OptimizationStages },
	{ from: "RuntimeGlobals", to: "runtime.RuntimeGlobals", readFrom: () => webpack.RuntimeGlobals, readTo: () => webpack.runtime.RuntimeGlobals },
	{ from: "RuntimeModule", to: "runtime.RuntimeModule", readFrom: () => webpack.RuntimeModule, readTo: () => webpack.runtime.RuntimeModule },
	{ from: "AutomaticPrefetchPlugin", to: "prefetch.AutomaticPrefetchPlugin", readFrom: () => webpack.AutomaticPrefetchPlugin, readTo: () => webpack.prefetch.AutomaticPrefetchPlugin },
	{ from: "PrefetchPlugin", to: "prefetch.PrefetchPlugin", readFrom: () => webpack.PrefetchPlugin, readTo: () => webpack.prefetch.PrefetchPlugin },
	{ from: "web.CssLoadingRuntimeModule", to: "css.CssLoadingRuntimeModule", readFrom: () => webpack.web.CssLoadingRuntimeModule, readTo: () => webpack.css.CssLoadingRuntimeModule }
];

describe("scoped exports", () => {
	for (const { name, read } of SCOPED) {
		it(`should expose webpack.${name}`, () => {
			expect(read()).toBeDefined();
		});
	}

	for (const { from, to, readFrom, readTo } of KEPT_ALIASES) {
		it(`should keep webpack.${from} pointing at webpack.${to}`, () => {
			expect(readFrom()).toBe(readTo());
		});
	}

	it("should keep the lib root shim pointing at util.RequestShortener", () => {
		expect(require("../../lib/RequestShortener")).toBe(
			webpack.util.RequestShortener
		);
	});
});
