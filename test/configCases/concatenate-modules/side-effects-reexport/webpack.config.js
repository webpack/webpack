"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "commonjs2"
		}
	},
	optimization: {
		concatenateModules: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				// hand the concatenation the connections in reverse insertion order
				compilation.hooks.optimizeChunkModules.tap(
					"Test",
					(chunks, modules) => {
						const { moduleGraph } = compilation;
						for (const module of modules) {
							const connections =
								/** @type {Set<import("../../../../").ModuleGraphConnection>} */
								(moduleGraph.getOutgoingConnections(module));
							const reversed = [...connections].reverse();
							connections.clear();
							for (const connection of reversed) connections.add(connection);
						}
					}
				);
			});
		}
	]
};
