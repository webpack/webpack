"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class CriticalDependencyWarning extends Error {
	constructor(message) {
		super();
		Error.captureStackTrace(this, CriticalDependencyWarning);
		this.name = "CriticalDependencyWarning";
		this.message = `Critical dependency: ${message}`;
	}
}
module.exports = CriticalDependencyWarning;
