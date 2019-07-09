/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../ChunkGroup").ChunkGroupOptions} ChunkGroupOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */

class ImportDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * @param {ChunkGroupOptions} groupOptions options for the chunk group
	 * @param {DependencyLocation} loc location info
	 * @param {string} request request string for the block
	 * @param {[number, number]} range position of the block
	 */
	constructor(groupOptions, loc, request, range) {
		super(groupOptions, loc, request);
		/** @type {[number, number]} */
		this.range = range;
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		super.deserialize(context);
	}
}

makeSerializable(
	ImportDependenciesBlock,
	"webpack/lib/dependencies/ImportDependenciesBlock"
);

module.exports = ImportDependenciesBlock;
