"use strict";
class ModuleStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("ModuleStatsPlugin", function(compilation) {
			compilation.hooks.stats.tap("ModuleStatsPlugin", function(stats) {
				stats.hooks.setDefault
					.for("modules")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("cached")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("nestedModules")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("modulesSort")
					.tap("ModuleStatsPlugin", () => "id");

				stats.hooks.setDefault
					.for("children")
					.tap("ModuleStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("moduleTrace")
					.tap("ModuleStatsPlugin", () => true);
			});
		});
	}
}
module.exports = ModuleStatsPlugin;
