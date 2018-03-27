"use strict";
const pluginName = "AdditionalStatsPlugin";
class AdditionalStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, function(compilation) {
			compilation.hooks.stats.tap(pluginName, function(stats) {
				stats.hooks.setDefault.for("performance").tap(pluginName, () => true);
				stats.hooks.setDefault.for("hash").tap(pluginName, () => true);
				stats.hooks.setDefault.for("env").tap(pluginName, () => false);
				stats.hooks.setDefault.for("version").tap(pluginName, () => true);
				stats.hooks.setDefault.for("timings").tap(pluginName, () => true);
				stats.hooks.setDefault.for("builtAt").tap(pluginName, () => true);
				stats.hooks.setDefault.for("entrypoints").tap(pluginName, () => true);
				stats.hooks.setDefault.for("errors").tap(pluginName, () => true);
				stats.hooks.setDefault.for("warnings").tap(pluginName, () => true);
				stats.hooks.setDefault
					.for("warningsFilter")
					.tap(pluginName, () => null);
			});
		});
	}
}
module.exports = AdditionalStatsPlugin;
