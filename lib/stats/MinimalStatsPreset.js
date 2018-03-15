const all = [
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
class MinimalStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("MinimalStatsPlugin", compilation => {
			compilation.hooks.stats.tap("MinimalStatsPlugin", stats => {
				all.forEach(item => {
					stats.hooks.setDefault
						.for(item)
						.tap("MinimalStatsPlugin", () => false);
				});
				stats.hooks.setDefault.for("maxModules").tap("MinimalStatsPlugin", 0);

				stats.hooks.setDefault
					.for("modules")
					.tap("MinimalStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("errors")
					.tap("MinimalStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("warnings")
					.tap("MinimalStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("modulesSort")
					.tap("MinimalStatsPlugin", () => "id");

				stats.hooks.setDefault
					.for("chunksSort")
					.tap("MinimalStatsPlugin", () => "id");

				stats.hooks.setDefault
					.for("assetsSort")
					.tap("MinimalStatsPlugin", () => "");
			});
		});
	}
}
module.exports = MinimalStatsPlugin;
