/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */

class DelegatedExportsDependency extends NullDependency {
	constructor(originModule, exports) {
		super();
		this.originModule = originModule;
		this.exports = exports;
	}

	get type() {
		return "delegated exports";
	}

	/**
	 * Returns the referenced module and export
	 * @returns {DependencyReference} reference
	 */
	getReference() {
		return new DependencyReference(this.originModule, true, false);
	}

	/**
	 * Returns the exported names
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports() {
		return {
			exports: this.exports,
			dependencies: undefined
		};
	}
}

module.exports = DelegatedExportsDependency;
