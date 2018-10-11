/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DependencyReference = require("./DependencyReference");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class DelegatedExportsDependency extends NullDependency {
	constructor(exports) {
		super();

		this.exports = exports;
	}

	get type() {
		return "delegated exports";
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		return new DependencyReference(
			() => moduleGraph.getParentModule(this),
			true,
			false
		);
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
	DelegatedExportsDependency,
	"webpack/lib/dependencies/DelegatedExportsDependency"
);

module.exports = DelegatedExportsDependency;
