"use strict";
const optionsForPreset = [
	"performance",
	"hash",
	"env",
	"version",
	"timings",
	"builtAt",
	"assets",
	"entrypoints",
	"chunks",
	"chunkModules",
	"chunkOrigins",
	"nestedModules",
	"moduleAssets",
	"depth",
	"cached",
	"cachedAssets",
	"reasons",
	"usedExports",
	"providedExports",
	"optimizationBailout",
	"children",
	"source",
	"moduleTrace",
	"errorDetails",
	"publicPath",
	"outputPath"
];
const pluginName = "MinimalStatsPlugin";
class MinimalStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.stats.tap(pluginName, stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault.for(item).tap(pluginName, () => false);
				});
				stats.hooks.setDefault.for("maxModules").tap(pluginName, () => 0);

				stats.hooks.setDefault.for("modules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("errors").tap(pluginName, () => true);

				stats.hooks.setDefault.for("warnings").tap(pluginName, () => true);

				stats.hooks.setDefault.for("modulesSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("chunksSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("assetsSort").tap(pluginName, () => "");
			});
		});
	}
}
module.exports = MinimalStatsPlugin;
