/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");
const WebpackError = require("./WebpackError");

/** @import { DependencyLocation } from "../graph/Dependency" */

class SystemImportDeprecationWarning extends WebpackError {
	/**
	 * Creates an instance of SystemImportDeprecationWarning.
	 * @param {DependencyLocation} loc location
	 */
	constructor(loc) {
		super(
			"System.import() is deprecated and will be removed soon. Use import() instead.\n" +
				"For more info visit https://webpack.js.org/guides/code-splitting/"
		);

		/** @type {string} */
		this.name = "SystemImportDeprecationWarning";

		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(
	SystemImportDeprecationWarning,
	"webpack/lib/errors/SystemImportDeprecationWarning"
);
registerLegacyRequest(
	SystemImportDeprecationWarning,
	"webpack/lib/dependencies/system/SystemPlugin",
	"SystemImportDeprecationWarning"
);
registerLegacyRequest(
	SystemImportDeprecationWarning,
	"webpack/lib/dependencies/SystemPlugin",
	"SystemImportDeprecationWarning"
);

module.exports = SystemImportDeprecationWarning;
