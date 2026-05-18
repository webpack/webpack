"use strict";

class CssOrderPriorityPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssOrderPriorityPlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			CssModulesPlugin.getCompilationHooks(compilation).orderModules.tap(
				"CssOrderPriorityPlugin",
				(_chunk, modules) => {
					// e.css must be first; remaining order is preserved (already by name).
					const result = [...modules];
					result.sort((a, b) => {
						const aFirst = a.identifier().endsWith("/e.css");
						const bFirst = b.identifier().endsWith("/e.css");
						if (aFirst && !bFirst) return -1;
						if (!aFirst && bFirst) return 1;
						return 0;
					});
					return result;
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	optimization: {
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
	plugins: [new CssOrderPriorityPlugin()],
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
