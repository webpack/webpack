/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../../graph/Dependency");
const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependency = require("../core/ModuleDependency");
const ModuleDependencyAsId = require("../core/ModuleDependencyTemplateAsId");

/** @import { ReferencedExports } from "../../graph/Dependency" */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @import { RuntimeSpec } from "../../util/runtime" */

class RequireResolveDependency extends ModuleDependency {
	/**
	 * Creates an instance of RequireResolveDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 * @param {string=} context context
	 */
	constructor(request, range, context) {
		super(request);

		this.range = range;
		/** @type {string | undefined} */
		this._context = context;
	}

	get type() {
		return "require.resolve";
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		// This doesn't use any export
		return Dependency.NO_EXPORTS_REFERENCED;
	}
}

makeSerializable(
	RequireResolveDependency,
	"webpack/lib/dependencies/commonjs/RequireResolveDependency"
);
registerLegacyRequest(
	RequireResolveDependency,
	"webpack/lib/dependencies/RequireResolveDependency"
);

RequireResolveDependency.Template = ModuleDependencyAsId;

module.exports = RequireResolveDependency;
