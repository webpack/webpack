class ChunkStatsPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("ChunkStatsPlugin", function(compilation) {
			compilation.hooks.stats.tap("ChunkStatsPlugin", function(stats) {
				stats.hooks.setDefault
					.for("chunkModules")
					.tap("ChunksStatsPlugin", () => true);

				stats.hooks.setDefault
					.for("chunksSort")
					.tap("ChunksStatsPlugin", () => "id");
			});
		});
	}
}
module.exports = ChunkStatsPlugin;
