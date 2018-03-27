"use strict";
const pluginName = "ModuleStatsPlugin";
class ModuleStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, function(compilation) {
			compilation.hooks.stats.tap(pluginName, function(stats) {
				stats.hooks.setDefault.for("modules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("cached").tap(pluginName, () => true);

				stats.hooks.setDefault.for("nestedModules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("modulesSort").tap(pluginName, () => "id");

				stats.hooks.setDefault.for("children").tap(pluginName, () => true);

				stats.hooks.setDefault.for("moduleTrace").tap(pluginName, () => true);
			});
		});
	}
}
module.exports = ModuleStatsPlugin;
