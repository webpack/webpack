/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class StaticExportsDependency extends NullDependency {
	/**
	 * @param {string[]} exports export names
	 */
	constructor(exports) {
		super();
		this.exports = exports;
	}

	get type() {
		return "static exports";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return {
			exports: this.exports,
			dependencies: undefined
		};
	}

	serialize(context) {
		const { write } = context;
		write(this.exports);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.exports = read();
		super.deserialize(context);
	}
}

makeSerializable(
	StaticExportsDependency,
	"webpack/lib/dependencies/StaticExportsDependency"
);

module.exports = StaticExportsDependency;
