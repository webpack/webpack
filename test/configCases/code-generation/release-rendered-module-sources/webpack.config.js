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
			// Reports on the root compilation, since a child's own errors do not
			// reach the test.
			compiler.hooks.done.tap("Observe", (stats) => {
				const { errors } = stats.compilation;
				// A run restoring its assets from the persistent cache renders
				// nothing, so there is nothing to assert; the uncached run asserts it.
				if (textBefore.size === 0) return;
				if (cleared.size !== textBefore.size) {
					errors.push(
						new Error(
							`${compilation.name || "main"}: released ${cleared.size} of ${textBefore.size} rendered module sources`
						)
					);
				}
				for (const [source, before] of textBefore) {
					if (String(source.source()) !== before) {
						errors.push(
							new Error(
								`${compilation.name || "main"}: a released source rendered different text`
							)
						);
					}
				}
			});
		});
	}
};

// A child compiler renders its own modules but never emits, and it does not
// inherit `afterEmit`, so its sources are released by the parent's.
/** @type {import("../../../../").WebpackPluginInstance} */
const buildChildCompilation = {
	apply(compiler) {
		const { EntryPlugin } = compiler.webpack;
		compiler.hooks.make.tapAsync("Child", (compilation, callback) => {
			const child = compilation.createChildCompiler(
				"child",
				{ filename: "child-bundle.js" },
				[new EntryPlugin(compiler.context, "./child.js", { name: "child" })]
			);
			child.runAsChild((err) => callback(err));
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Keeps the two modules apart, so the chunk renders module factories rather
	// than inlining one module into its startup.
	optimization: { concatenateModules: false },
	plugins: [observeRenderedSourceRelease, buildChildCompilation]
};
