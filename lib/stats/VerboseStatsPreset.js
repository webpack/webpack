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
class VerboseStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("verboseStatsPlugin", compilation => {
			compilation.hooks.stats.tap("verboseStatsPlugin", stats => {
				all.forEach(item => {
					stats.hooks.setDefault
						.for(item)
						.tap("verboseStatsPlugin", () => true);
				});
				stats.hooks.setDefault
					.for("modules")
					.tap("verboseStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("cachedAssets")
					.tap("verboseStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("cached")
					.tap("verboseStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("moduleAssets")
					.tap("verboseStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("outputPath")
					.tap("verboseStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("source")
					.tap("verboseStatsPlugin", () => false);

				stats.hooks.setDefault
					.for("exclude")
					.tap("verboseStatsPlugin", () => () => false);

				stats.hooks.setDefault
					.for("maxModules")
					.tap("verboseStatsPlugin", Infinity);

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
module.exports = VerboseStatsPlugin;
