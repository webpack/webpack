/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class RuntimeChunkPlugin {
	constructor(options) {
		this.single = options === "single";
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("RuntimeChunkPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap("RuntimeChunkPlugin", () => {
				const singleRuntimeChunk = this.single ? compilation.addChunk("runtime") : undefined;

				for(const entrypoint of compilation.entrypoints.values()) {
					const chunk = entrypoint.getRuntimeChunk();
					if(chunk.getNumberOfModules() > 0) {
						const newChunk = this.single ? singleRuntimeChunk : compilation.addChunk(entrypoint.name + "-runtime");
						entrypoint.unshiftChunk(newChunk);
						newChunk.addGroup(entrypoint);
						entrypoint.setRuntimeChunk(newChunk);
					}
				}
			});
		});
	}
};
