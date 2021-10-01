const { NormalModule } = require("webpack");

const PLUGIN_NAME = "PluginWithLoader";
const loaderPath = require.resolve("./loader.js");

class PluginWithLoader {
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
				PLUGIN_NAME,
				(loaders, normalModule) => {
					if (normalModule.userRequest.indexOf("a.js") !== -1) {
						loaders.push({
							loader: loaderPath,
							options: {},
							ident: null,
							type: null
						});
					}
				}
			);
		});
	}
}

module.exports = PluginWithLoader;
