/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";

const WebpackError = require("./WebpackError");

module.exports = class AsyncDependencyToInitialChunkError extends WebpackError {
	constructor(chunkName, module, loc) {
		super();

		this.name = "AsyncDependencyToInitialChunkError";
		this.message = `It's not allowed to load an initial chunk on demand. The chunk name "${chunkName}" is already used by an entrypoint.`;
		this.module = module;
		this.origin = module;
		this.originLoc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
};
