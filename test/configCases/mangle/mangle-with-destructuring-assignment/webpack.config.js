// const { getRuntimeKey } = require("../../../../lib/util/runtime");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				resourceQuery: /side-effects/,
				sideEffects: true
			}
		]
	},
	optimization: {
		mangleExports: true,
		usedExports: true,
		providedExports: true,
		concatenateModules: false
	},
	plugins: [
		function getJsonCodeGeneratedSource(compiler) {
			compiler.hooks.compilation.tap(
				getJsonCodeGeneratedSource.name,
				compilation => {
					compilation.hooks.processAssets.tap(
						getJsonCodeGeneratedSource.name,
						() => {
							for (const module of compilation.modules) {
								if (module.type === "json") {
									const { sources } = compilation.codeGenerationResults.get(
										module,
										"main"
									);
									const source = sources.get("javascript");
									const file = compilation.getAssetPath("[name].js", {
										filename: `${module
											.readableIdentifier(compilation.requestShortener)
											.replace(/[?#]/g, "_")}.js`
									});
									compilation.emitAsset(file, source);
								}
							}
						}
					);
				}
			);
		}
	]
};
