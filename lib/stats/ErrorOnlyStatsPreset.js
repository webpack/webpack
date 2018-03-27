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
	"modules",
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
	"errorDetails",
	"warnings",
	"publicPath",
	"outputPath"
];
const pluginName = "ErrorsOnlyStatsPlugin";
class ErrorsOnlyStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.stats.tap(pluginName, stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault.for(item).tap(pluginName, () => false);
				});

				stats.hooks.setDefault.for("errors").tap(pluginName, () => true);

				stats.hooks.setDefault.for("moduleTrace").tap(pluginName, () => true);
			});
		});
	}
}
module.exports = ErrorsOnlyStatsPlugin;
