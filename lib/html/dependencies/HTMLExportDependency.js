/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NullDependency = require("../../dependencies/NullDependency");

class HTMLExportDependency extends NullDependency {
	constructor(exports) {
		super();

		this.exports = exports;
	}

	get type() {
		return "html exports";
	}

	getExports() {
		return {
			exports: this.exports
		};
	}
}

module.exports = HTMLExportDependency;
