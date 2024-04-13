const { getRuntimeKey } = require("../../../../lib/util/runtime");

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
		providedExports: true
	},
	plugins: [
		function jsonExportsInfo(compiler) {
			compiler.hooks.compilation.tap(jsonExportsInfo.name, compilation => {
				compilation.hooks.processAssets.tap(jsonExportsInfo.name, () => {
					const getMangleInfo = (exportInfo, runtime, module, mangleInfo) => {
						mangleInfo[exportInfo.name] = {
							usedName: exportInfo.getUsedName(runtime),
							used: exportInfo.getUsed(runtime)
						};
						const nested = exportInfo.getNestedExportsInfo();
						if (nested) {
							for (const e of nested.exports) {
								getMangleInfo(e, runtime, module, mangleInfo[exportInfo.name]);
							}
						}
					};
					const map = {};
					for (const chunk of compilation.chunks) {
						const map2 = (map[getRuntimeKey(chunk.runtime)] = {});
						for (const module of compilation.modules) {
							if (module.type !== "json") continue;
							const map3 = (map2[
								module.readableIdentifier(compilation.requestShortener)
							] = {});
							for (const exportInfo of compilation.moduleGraph.getExportsInfo(
								module
							).exports) {
								getMangleInfo(exportInfo, chunk.runtime, module, map3);
							}
						}
					}
					compilation.emitAsset(
						"json-exports-info.json",
						new compiler.webpack.sources.RawSource(
							JSON.stringify(map, undefined, 2)
						)
					);
				});
			});
		}
	]
};
