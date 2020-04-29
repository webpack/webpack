/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");

/** @typedef {import("../ChunkGroup")} ChunkGroup */

class OverridableDependenciesBlock extends AsyncDependenciesBlock {
	constructor() {
		super({});
	}

	/**
	 * @param {ChunkGroup} parentChunkGroup the parent chunk group
	 * @returns {boolean} true when this dependencies block should be loaded async
	 */
	isAsync(parentChunkGroup) {
		return !parentChunkGroup.isInitial();
	}
}

module.exports = OverridableDependenciesBlock;
