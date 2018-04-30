/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class RuntimeChunkPlugin {
	constructor(options) {
		this.options = Object.assign(
			{
				name: entrypoint => `runtime~${entrypoint.name}`
			},
			options
		);
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("RuntimeChunkPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap("RuntimeChunkPlugin", () => {
				for (const entrypoint of compilation.entrypoints.values()) {
					const chunk = entrypoint.getRuntimeChunk();
					if (chunk.getNumberOfModules() > 0) {
						let name = this.options.name;
						if (typeof name === "function") {
							name = name(entrypoint);
						}
						const newChunk = compilation.addChunk(name);
						newChunk.preventIntegration = true;
						entrypoint.unshiftChunk(newChunk);
						newChunk.addGroup(entrypoint);
						entrypoint.setRuntimeChunk(newChunk);
					}
				}
			});
		});
	}
};
