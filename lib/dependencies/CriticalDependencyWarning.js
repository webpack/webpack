/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class CriticalDependencyWarning extends Error {

	constructor(message) {
		super();
		if(Error.hasOwnProperty("captureStackTrace")) {
			Error.captureStackTrace(this, this.constructor);
		}
		this.name = "CriticalDependencyWarning";
		this.message = "Critical dependency: " + message;
	}
}

module.exports = CriticalDependencyWarning;
