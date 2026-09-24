/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../../graph/AsyncDependenciesBlock");
const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");

/** @import { DependencyLocation } from "../../graph/Dependency" */

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * Creates an instance of AMDRequireDependenciesBlock.
	 * @param {DependencyLocation} loc location info
	 * @param {string=} request request
	 */
	constructor(loc, request) {
		super(null, loc, request);
	}
}

makeSerializable(
	AMDRequireDependenciesBlock,
	"webpack/lib/dependencies/amd/AMDRequireDependenciesBlock"
);
registerLegacyRequest(
	AMDRequireDependenciesBlock,
	"webpack/lib/dependencies/AMDRequireDependenciesBlock"
);

module.exports = AMDRequireDependenciesBlock;
