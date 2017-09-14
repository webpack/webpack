/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");

class DelegatedExportsDependency extends NullDependency {
	constructor(originModule, exports) {
		super();
		this.originModule = originModule;
		this.exports = exports;
	}

	get type() {
		return "delegated exports";
	}

	getReference() {
		return {
			module: this.originModule,
			importedNames: true
		};
	}

	getExports() {
		return {
			exports: this.exports
		};
	}
}

module.exports = DelegatedExportsDependency;
