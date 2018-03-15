"use strict";
class AssetsStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("AssetStatsPlugin", function(compilation) {
			compilation.hooks.stats.tap("AssetStatsPlugin", function(stats) {
				stats.hooks.setDefault
					.for("assets")
					.tap("AssetStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("cachedAssets")
					.tap("AssetStatsPlugin", () => true);
				stats.hooks.setDefault
					.for("excludeAssets")
					.tap("AssetStatsPlugin", () => []);
				stats.hooks.setDefault
					.for("assetsSort")
					.tap("AssetStatsPlugin", () => "");
			});
		});
	}
}
module.exports = AssetsStatsPlugin;
