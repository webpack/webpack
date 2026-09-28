/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const { registerLegacyRequest } = require("../util/serialization");
const WebpackError = require("./WebpackError");

/** @import { DependencyLocation } from "../graph/Dependency" */

class RequireIncludeDeprecationWarning extends WebpackError {
	/**
	 * Creates an instance of RequireIncludeDeprecationWarning.
	 * @param {DependencyLocation} loc location
	 */
	constructor(loc) {
		super("require.include() is deprecated and will be removed soon.");

		/** @type {string} */
		this.name = "RequireIncludeDeprecationWarning";

		/** @type {DependencyLocation} */
		this.loc = loc;
	}
}

makeSerializable(
	RequireIncludeDeprecationWarning,
	"webpack/lib/errors/RequireIncludeDeprecationWarning"
);
registerLegacyRequest(
	RequireIncludeDeprecationWarning,
	"webpack/lib/dependencies/commonjs/RequireIncludeDependencyParserPlugin",
	"RequireIncludeDeprecationWarning"
);
registerLegacyRequest(
	RequireIncludeDeprecationWarning,
	"webpack/lib/dependencies/RequireIncludeDependencyParserPlugin",
	"RequireIncludeDeprecationWarning"
);

module.exports = RequireIncludeDeprecationWarning;
