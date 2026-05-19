"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {ReturnType<typeof import("../../../../").css.CssModulesPlugin.getCompilationHooks>} CssCompilationHooks */

/**
 * @typedef {object} Variant
 * @property {string} name scenario name
 * @property {(hooks: CssCompilationHooks) => void} tap registers taps on the orderModules hook
 */

const E_CSS_RE = /[\\/]e\.css$/;

/** @type {Variant[]} */
const variants = [
	{
		name: "name",
		tap(hooks) {
			// Modules arrive pre-sorted by full module name, so return as-is.
			hooks.orderModules.tap("Name", (_chunk, modules) => modules);
		}
	},
	{
		name: "priority",
		tap(hooks) {
			hooks.orderModules.tap("Priority", (_chunk, modules) => {
				// e.css must be first; remaining order is preserved (already by name).
				const result = [...modules];
				result.sort((a, b) => {
					const aFirst = E_CSS_RE.test(a.identifier());
					const bFirst = E_CSS_RE.test(b.identifier());
					if (aFirst && !bFirst) return -1;
					if (!aFirst && bFirst) return 1;
					return 0;
				});
				return result;
			});
		}
	},
	{
		name: "fallback",
		tap(hooks) {
			// Returning undefined lets webpack apply its default import-order
			// topological sort (which still emits the "Conflicting order" warning).
			hooks.orderModules.tap("Fallback", () => undefined);
		}
	},
	{
		name: "multi-tap",
		tap(hooks) {
			hooks.orderModules.tap("First", (_chunk, modules) => modules);
			hooks.orderModules.tap("Second", () => {
				throw new Error(
					"second tap must not run when the first tap returned a value"
				);
			});
		}
	}
];

/**
 * @param {Variant} variant scenario variant
 * @returns {import("../../../../").WebpackPluginInstance} plugin instance
 */
const makePlugin = (variant) => ({
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("OrderModulesTestPlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			variant.tap(CssModulesPlugin.getCompilationHooks(compilation));
		});
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = variants.map((variant, idx) => ({
	target: "web",
	mode: "development",
	entry: `./${variant.name}.js`,
	output: {
		filename: `bundle${idx}.js`,
		chunkFilename: `${variant.name}-[name].bundle${idx}.js`,
		cssChunkFilename: `${variant.name}-[name].bundle${idx}.css`
	},
	experiments: {
		css: true
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				css: {
					type: "css/auto",
					enforce: true,
					name: "css"
				}
			}
		}
	},
	plugins: [makePlugin(variant)],
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
}));
