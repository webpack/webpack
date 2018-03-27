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
	"depth",
	"usedExports",
	"providedExports",
	"optimizationBailout",
	"children",
	"reasons",
	"moduleTrace",
	"errors",
	"errorDetails",
	"warnings",
	"publicPath"
];
const pluginName = "VerboseStatsPlugin";
class VerboseStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.stats.tap(pluginName, stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault.for(item).tap(pluginName, () => true);
				});
				stats.hooks.setDefault.for("modules").tap(pluginName, () => false);
				stats.hooks.setDefault.for("cachedAssets").tap(pluginName, () => false);
				stats.hooks.setDefault.for("cached").tap(pluginName, () => false);
				stats.hooks.setDefault.for("moduleAssets").tap(pluginName, () => false);
				stats.hooks.setDefault.for("outputPath").tap(pluginName, () => false);
				stats.hooks.setDefault.for("source").tap(pluginName, () => false);

				stats.hooks.setDefault
					.for("exclude")
					.tap(pluginName, () => () => false);

				stats.hooks.setDefault
					.for("maxModules")
					.tap(pluginName, () => Infinity);

				stats.hooks.setDefault.for("modulesSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("chunksSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("assetsSort").tap(pluginName, () => "");
			});
		});
	}
}
module.exports = VerboseStatsPlugin;
