/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class CommonJsInHarmonyWarning extends Error {
	constructor(name) {
		super();

		if(Error.hasOwnProperty("captureStackTrace")) {
			Error.captureStackTrace(this, this.constructor);
		}
		this.name = "CommonJsInHarmonyWarning";

		this.message = `${name} is not allowed in EcmaScript module: This module was detected as EcmaScript module (import or export syntax was used). In such a module using '${name}' is not allowed.`;
	}
};
