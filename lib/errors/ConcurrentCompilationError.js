/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Maksim Nazarjev @acupofspirt
*/

import WebpackError from "./WebpackError.js";

class ConcurrentCompilationError extends WebpackError {
	constructor() {
		super(
			"You ran Webpack twice. Each instance only supports a single concurrent compilation at a time."
		);

		/** @type {string} */
		this.name = "ConcurrentCompilationError";
	}
}

export default ConcurrentCompilationError;

export { ConcurrentCompilationError as "module.exports" };
