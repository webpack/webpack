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
class ErrorsOnlyStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("ErrorOnlyStatsPlugin", compilation => {
			compilation.hooks.stats.tap("ErrorOnlyStatsPlugin", stats => {
				optionsForPreset.forEach(item => {
					stats.hooks.setDefault
						.for(item)
						.tap("ErrorOnlyStatsPlugin", () => false);
				});

				stats.hooks.setDefault
					.for("errors")
					.tap("ErrorOnlyStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("moduleTrace")
					.tap("ErrorOnlyStatsPlugin", () => true);
			});
		});
	}
}
module.exports = ErrorsOnlyStatsPlugin;
