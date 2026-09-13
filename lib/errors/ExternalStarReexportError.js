/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @import ExternalModule from "../ExternalModule" */
/** @import Module from "../Module" */

/**
 * Error raised when a `module` library reexports everything from an external
 * whose request names a property path instead of a module.
 */
class ExternalStarReexportError extends WebpackError {
	/**
	 * Captures the external and the library entry reexporting from it.
	 * @param {ExternalModule} externalModule the reexported external
	 * @param {Module} module the library entry module
	 */
	constructor(externalModule, module) {
		const request = /** @type {string[]} */ (
			externalModule.getResolvedRequest()
		);
		super(
			`Can't 'export * from ${JSON.stringify(
				externalModule.userRequest
			)}': the external is configured as ${JSON.stringify(
				request
			)}, which is a property of ${JSON.stringify(
				request[0]
			)} and has no module specifier to reexport. Reexport the names explicitly or configure the external without a property path.`
		);

		/** @type {string} */
		this.name = "ExternalStarReexportError";
		/** @type {Module} */
		this.module = module;
	}
}

module.exports = ExternalStarReexportError;
