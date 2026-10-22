/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import { DependencyKinds } from "../graph/Dependency" */

const ModuleDependency = require("../dependencies/core/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class ProvideForSharedDependency extends ModuleDependency {
	/**
	 * Creates an instance of ProvideForSharedDependency.
	 * @param {string} request request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "provide module for shared";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ProvideForSharedDependency,
	"webpack/lib/sharing/ProvideForSharedDependency"
);

/** @type {Set<keyof DependencyKinds>} */
ProvideForSharedDependency.KINDS = new Set([
	...ModuleDependency.KINDS,
	"sharing-request"
]);

module.exports = ProvideForSharedDependency;
