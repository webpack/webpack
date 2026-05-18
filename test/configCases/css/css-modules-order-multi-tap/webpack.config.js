"use strict";

class CssOrderFirstPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssOrderFirstPlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			CssModulesPlugin.getCompilationHooks(compilation).orderModules.tap(
				"CssOrderFirstPlugin",
				// Wins because SyncBailHook stops at the first non-undefined result.
				(_chunk, modules) => modules
			);
		});
	}
}

class CssOrderSecondPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("CssOrderSecondPlugin", (compilation) => {
			const CssModulesPlugin = compiler.webpack.css.CssModulesPlugin;
			CssModulesPlugin.getCompilationHooks(compilation).orderModules.tap(
				"CssOrderSecondPlugin",
				() => {
					throw new Error(
						"second tap must not be called when first tap bailed"
					);
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
	plugins: [new CssOrderFirstPlugin(), new CssOrderSecondPlugin()],
	externalsPresets: {
		node: true
	},
	node: {
		__dirname: false
	}
};
