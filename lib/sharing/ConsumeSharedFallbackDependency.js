/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import { DependencyKinds } from "../graph/Dependency" */

const ModuleDependency = require("../dependencies/core/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class ConsumeSharedFallbackDependency extends ModuleDependency {
	/**
	 * Creates an instance of ConsumeSharedFallbackDependency.
	 * @param {string} request the request
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "consume shared fallback";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ConsumeSharedFallbackDependency,
	"webpack/lib/sharing/ConsumeSharedFallbackDependency"
);

/** @type {Set<keyof DependencyKinds>} */
ConsumeSharedFallbackDependency.KINDS = new Set([
	...ModuleDependency.KINDS,
	"sharing-request"
]);

module.exports = ConsumeSharedFallbackDependency;
