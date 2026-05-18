"use strict";

class CssOrderByNamePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssOrderByNamePlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			CssModulesPlugin.getCompilationHooks(compilation).orderModules.tap(
				"CssOrderByNamePlugin",
				(_chunk, modules) => modules
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
	plugins: [new CssOrderByNamePlugin()],
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
