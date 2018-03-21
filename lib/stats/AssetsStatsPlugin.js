"use strict";
const pluginName = "assetsStatsPlugin";
class AssetsStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, function(compilation) {
			compilation.hooks.stats.tap(pluginName, function(stats) {
				stats.hooks.setDefault.for("assets").tap(pluginName, () => true);
				stats.hooks.setDefault.for("cachedAssets").tap(pluginName, () => true);
				stats.hooks.setDefault.for("excludeAssets").tap(pluginName, () => []);
				stats.hooks.setDefault.for("assetsSort").tap(pluginName, () => "");
			});
		});
	}
}
module.exports = AssetsStatsPlugin;
