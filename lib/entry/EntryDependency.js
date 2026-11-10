/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import { DependencyKinds } from "../graph/Dependency" */

const ModuleDependency = require("../dependencies/core/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class EntryDependency extends ModuleDependency {
	/**
	 * Creates an instance of EntryDependency.
	 * @param {string} request request path for entry
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "entry";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(EntryDependency, [
	"webpack/lib/entry/EntryDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/EntryDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
EntryDependency.KINDS = new Set([...ModuleDependency.KINDS, "entry"]);

module.exports = EntryDependency;
