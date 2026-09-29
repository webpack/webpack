"use strict";

/**
 * Asserts the contract `EvalDevToolModulePlugin` relies on: it drops each
 * rendered source's cached copy, and reading that source afterwards still
 * returns the same text.
 * @type {import("../../../../").WebpackPluginInstance}
 */
const observeSourceCacheClearing = {
	apply(compiler) {
		const { JavascriptModulesPlugin } = compiler.webpack.javascript;
		compiler.hooks.compilation.tap("Observe", (compilation) => {
			/** @type {Map<import("webpack-sources").Source, string>} */
			const textBefore = new Map();
			/** @type {Set<import("webpack-sources").Source>} */
			const cleared = new Set();

			// Registered before EvalDevToolModulePlugin taps, so this sees each
			// original source rather than the eval wrapper replacing it.
			JavascriptModulesPlugin.getCompilationHooks(
				compilation
			).renderModuleContent.tap("Observe", (source) => {
				if (textBefore.has(source)) return source;
				textBefore.set(source, String(source.source()));
				const { clearCache } = source;
				if (typeof clearCache === "function") {
					source.clearCache = (...args) => {
						cleared.add(source);
						return clearCache.apply(source, args);
					};
				}
				return source;
			});

			compilation.hooks.afterSeal.tap("Observe", () => {
				// A run restoring its assets from the persistent cache renders
				// nothing, so there is nothing to assert; the uncached run asserts it.
				if (textBefore.size === 0) return;
				if (cleared.size !== textBefore.size) {
					compilation.errors.push(
						new Error(
							`Observe: cleared ${cleared.size} of ${textBefore.size} rendered sources`
						)
					);
				}
				for (const [source, before] of textBefore) {
					if (String(source.source()) !== before) {
						compilation.errors.push(
							new Error("Observe: a source read differently after clearCache")
						);
						return;
					}
				}
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: "eval",
	plugins: [observeSourceCacheClearing]
};
