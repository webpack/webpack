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
	"moduleTrace",
	"errors",
	"errorDetails",
	"warnings",
	"publicPath",
	"outputPath"
];
const pluginName = "NoStatStatsPlugin";
class NoStatStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.stats.tap(pluginName, stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault.for(item).tap(pluginName, () => false);
				});
			});
		});
	}
}
module.exports = NoStatStatsPlugin;
