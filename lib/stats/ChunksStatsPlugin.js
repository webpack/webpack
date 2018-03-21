"use strict";
const pluginName = "chunkStatsPlugin";
class ChunkStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, function(compilation) {
			compilation.hooks.stats.tap(pluginName, function(stats) {
				stats.hooks.setDefault.for("chunkModules").tap(pluginName, () => true);

				stats.hooks.setDefault.for("chunksSort").tap(pluginName, () => "id");
			});
		});
	}
}
module.exports = ChunkStatsPlugin;
