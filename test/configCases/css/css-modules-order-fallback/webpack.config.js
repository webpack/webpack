"use strict";

class CssOrderFallbackPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssOrderFallbackPlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			CssModulesPlugin.getCompilationHooks(compilation).orderModules.tap(
				"CssOrderFallbackPlugin",
				// Returning undefined means: let webpack apply its default
				// import-order topological sort (which still warns on conflicts).
				() => undefined
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
	plugins: [new CssOrderFallbackPlugin()],
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
