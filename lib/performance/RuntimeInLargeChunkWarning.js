/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

class RuntimeInLargeChunkWarning extends WebpackError {
	/**
	 * Creates an instance of RuntimeInLargeChunkWarning.
	 * @param {string[]} entrypoints names of the entrypoints carrying the runtime
	 */
	constructor(entrypoints) {
		super(
			`webpack performance recommendations: \nThe runtime is part of the initial chunk of ${entrypoints.join(
				", "
			)}. It describes every other chunk, so a change anywhere in the build rewrites these assets and clients download them again.\nSet 'optimization.runtimeChunk' to emit the runtime as its own chunk.\nFor more info visit https://webpack.js.org/configuration/optimization/#optimizationruntimechunk`
		);

		/** @type {string} */
		this.name = "RuntimeInLargeChunkWarning";
	}
}

module.exports = RuntimeInLargeChunkWarning;
