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
class NoStatStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("NoStatStatsPlugin", compilation => {
			compilation.hooks.stats.tap("NoStatStatsPlugin", stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault
						.for(item)
						.tap("NoStatStatsPlugin", () => false);
				});
			});
		});
	}
}
module.exports = NoStatStatsPlugin;
