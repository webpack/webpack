"use strict";

/**
 * Reads the emitted assets so the rendered module sources memoize their
 * flattened text, then checks that emitting released it again.
 * @type {import("../../../../").WebpackPluginInstance}
 */
const observeRenderedSourceRelease = {
	apply(compiler) {
		const { Compilation } = compiler.webpack;
		const { JavascriptModulesPlugin } = compiler.webpack.javascript;
		compiler.hooks.compilation.tap("Observe", (compilation) => {
			/** @type {Map<import("webpack-sources").Source, string>} */
			const textBefore = new Map();
			/** @type {Set<import("webpack-sources").Source>} */
			const cleared = new Set();
			JavascriptModulesPlugin.getCompilationHooks(
				compilation
			).renderModuleContainer.tap("Observe", (source) => {
				if (textBefore.has(source)) return source;
				textBefore.set(source, "");
				const { clearCache } = source;
				if (typeof clearCache === "function") {
					source.clearCache = (...args) => {
						cleared.add(source);
						return clearCache.apply(source, args);
					};
				}
				return source;
			});
			compilation.hooks.processAssets.tap(
				{
					name: "Observe",
					stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				(assets) => {
					for (const name of Object.keys(assets)) String(assets[name].source());
					for (const source of textBefore.keys()) {
						textBefore.set(source, String(source.source()));
					}
				}
			);
			compiler.hooks.done.tap("Observe", () => {
				// A run restoring its assets from the persistent cache renders
				// nothing, so there is nothing to assert; the uncached run asserts it.
				if (textBefore.size === 0) return;
				if (cleared.size !== textBefore.size) {
					compilation.errors.push(
						new Error(
							`released ${cleared.size} of ${textBefore.size} rendered module sources`
						)
					);
				}
				for (const [source, before] of textBefore) {
					if (String(source.source()) !== before) {
						compilation.errors.push(
							new Error("a released source rendered different text")
						);
					}
				}
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Keeps the two modules apart, so the chunk renders module factories rather
	// than inlining one module into its startup.
	optimization: { concatenateModules: false },
	plugins: [observeRenderedSourceRelease]
};
