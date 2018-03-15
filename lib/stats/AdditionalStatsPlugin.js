class AdditionalStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("AdditionalStatsPlugin", function(
			compilation
		) {
			compilation.hooks.stats.tap("AdditionalStatsPlugin", function(stats) {
				stats.hooks.setDefault
					.for("performance")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("hash")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("env")
					.tap("AdditionalStatsPlugin", () => false);
				stats.hooks.setDefault
					.for("version")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("timings")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("builtAt")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("entrypoints")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("errors")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("warnings")
					.tap("AdditionalStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("warningsFilter")
					.tap("AdditionalStatsPlugin", () => null);
			});
		});
	}
}
module.exports = AdditionalStatsPlugin;
