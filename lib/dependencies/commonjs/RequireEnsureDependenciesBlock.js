/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../../graph/AsyncDependenciesBlock");
const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");

/** @import { GroupOptions } from "../../graph/AsyncDependenciesBlock" */
/** @import { DependencyLocation } from "../../graph/Dependency" */

class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * Creates an instance of RequireEnsureDependenciesBlock.
	 * @param {GroupOptions | string | null} chunkName chunk name
	 * @param {(DependencyLocation | null)=} loc location info
	 */
	constructor(chunkName, loc) {
		super(chunkName, loc, null);
	}
}

makeSerializable(
	RequireEnsureDependenciesBlock,
	"webpack/lib/dependencies/commonjs/RequireEnsureDependenciesBlock"
);
registerLegacyRequest(
	RequireEnsureDependenciesBlock,
	"webpack/lib/dependencies/RequireEnsureDependenciesBlock"
);

module.exports = RequireEnsureDependenciesBlock;
