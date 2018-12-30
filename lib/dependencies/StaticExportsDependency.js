/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const DependencyReference = require("./DependencyReference");
const NullDependency = require("./NullDependency");

/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

class StaticExportsDependency extends NullDependency {
	/**
	 * @param {string[] | true} exports export names
	 * @param {boolean} canMangle true, if mangling exports names is allowed
	 */
	constructor(exports, canMangle) {
		super();
		this.exports = exports;
		this.canMangle = canMangle;
	}

	get type() {
		return "static exports";
	}

	/**
	 * Returns the referenced module and export
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {DependencyReference} reference
	 */
	getReference(moduleGraph) {
		if (this.canMangle) return null;
		// reference itself
		// this sets usedExports to true, which prevents mangling
		// TODO introduce a flag whether exports can be mangled or not
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
	StaticExportsDependency,
	"webpack/lib/dependencies/StaticExportsDependency"
);

module.exports = StaticExportsDependency;
