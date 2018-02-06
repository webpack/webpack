/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NullDependency = require("../../dependencies/NullDependency");

class CSSExportDependency extends NullDependency {
	constructor(exports) {
		super();

		this.exports = exports;
	}

	get type() {
		return "css exports";
	}

	getExports() {
		return {
			exports: this.exports
		};
	}
}

CSSExportDependency.Template = class CSSExportDependencyTemplate {
	apply(source, dependency) {
		return source;
	}
};

module.exports = CSSExportDependency;
