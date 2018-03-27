"use strict";
const pluginName = "DetailedStatsPlugin";
class DetailedStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.stats.tap(pluginName, stats => {
				stats.hooks.setDefault.for("hash").tap(pluginName, () => true);

				stats.hooks.setDefault.for("modulesSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("moduleTrace").tap(pluginName, () => true);

				stats.hooks.setDefault.for("chunkModules").tap(pluginName, () => false);

				stats.hooks.setDefault.for("nestedModules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("children").tap(pluginName, () => true);

				stats.hooks.setDefault.for("performance").tap(pluginName, () => true);

				stats.hooks.setDefault.for("chunksSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("version").tap(pluginName, () => true);

				stats.hooks.setDefault.for("warnings").tap(pluginName, () => true);

				stats.hooks.setDefault.for("warningFilter").tap(pluginName, () => null);

				stats.hooks.setDefault.for("errors").tap(pluginName, () => true);

				stats.hooks.setDefault.for("modules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("moduleAssets").tap(pluginName, () => false);

				stats.hooks.setDefault.for("assets").tap(pluginName, () => true);

				stats.hooks.setDefault.for("cachedAssets").tap(pluginName, () => false);

				stats.hooks.setDefault.for("env").tap("ModuleStatsPlugin", () => false);

				stats.hooks.setDefault.for("timings").tap(pluginName, () => true);

				stats.hooks.setDefault.for("builtAt").tap(pluginName, () => true);

				stats.hooks.setDefault.for("entrypoints").tap(pluginName, () => true);

				stats.hooks.setDefault.for("chunks").tap(pluginName, () => true);

				stats.hooks.setDefault.for("chunkOrigins").tap(pluginName, () => true);

				stats.hooks.setDefault.for("depth").tap(pluginName, () => true);

				stats.hooks.setDefault.for("usedExports").tap(pluginName, () => true);

				stats.hooks.setDefault
					.for("providedExports")
					.tap(pluginName, () => true);

				stats.hooks.setDefault
					.for("optimizationBailout")
					.tap(pluginName, () => false);

				stats.hooks.setDefault.for("errorDetails").tap(pluginName, () => true);

				stats.hooks.setDefault.for("errors").tap(pluginName, () => true);

				stats.hooks.setDefault.for("publicPath").tap(pluginName, () => true);

				stats.hooks.setDefault
					.for("exclude")
					.tap(pluginName, () => () => false);

				stats.hooks.setDefault
					.for("maxModules")
					.tap(pluginName, () => Infinity);

				stats.hooks.setDefault.for("assetsSort").tap(pluginName, () => "");
			});
		});
	}
}
module.exports = DetailedStatsPlugin;
