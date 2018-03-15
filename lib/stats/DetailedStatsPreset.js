class DetailedStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("DetailedStatsPlugin", compilation => {
			compilation.hooks.stats.tap("DetailedStatsPlugin", stats => {
				stats.hooks.setDefault
					.for("hash")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("modulesSort")
					.tap("ModuleStatsPlugin", () => "id");

				stats.hooks.setDefault
					.for("moduleTrace")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("chunkModules")
					.tap("ModuleStatsPlugin", () => false);

				stats.hooks.setDefault
					.for("nestedModules")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("children")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("performance")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("chunksSort")
					.tap("ModuleStatsPlugin", () => "id");

				stats.hooks.setDefault
					.for("version")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("warnings")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("warningFilter")
					.tap("ModuleStatsPlugin", () => null);

				stats.hooks.setDefault
					.for("errors")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("modules")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("moduleAssets")
					.tap("ModuleStatsPlugin", () => false);

				stats.hooks.setDefault
					.for("assets")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("cachedAssets")
					.tap("moduleStatsPlugin", () => false);

				stats.hooks.setDefault.for("env").tap("ModuleStatsPlugin", () => false);

				stats.hooks.setDefault
					.for("timings")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("builtAt")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("entrypoints")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("chunks")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("chunkOrigins")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("depth")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("usedExports")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("providedExports")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("optimizationBailout")
					.tap("DetailedStatsPlugin", () => false);

				stats.hooks.setDefault
					.for("errorDetails")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("errors")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("publicPath")
					.tap("DetailedStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("exclude")
					.tap("DetailedStatsPlugin", () => () => false);

				stats.hooks.setDefault
					.for("maxModules")
					.tap("DetailedStatsPlugin", Infinity);

				stats.hooks.setDefault
					.for("assetsSort")
					.tap("MinimalStatsPlugin", () => "");
			});
		});
	}
}
module.exports = DetailedStatsPlugin;
