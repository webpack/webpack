/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const DependenciesBlock = require("./DependenciesBlock");

module.exports = class AsyncDependenciesBlock extends DependenciesBlock {
	constructor(groupOptions, module, loc, request) {
		super();
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions };
		} else if (!groupOptions) {
			groupOptions = { name: undefined };
		}
		this.groupOptions = groupOptions;
		this.chunkGroup = undefined;
		this.module = module;
		this.loc = loc;
		this.request = request;
	}

	get chunkName() {
		return this.groupOptions.name;
	}

	set chunkName(value) {
		this.groupOptions.name = value;
	}

	get chunks() {
		throw new Error("Moved to AsyncDependenciesBlock.chunkGroup");
	}

	set chunks(value) {
		throw new Error("Moved to AsyncDependenciesBlock.chunkGroup");
	}

	updateHash(hash) {
		hash.update(JSON.stringify(this.groupOptions));
		hash.update(
			(this.chunkGroup &&
				this.chunkGroup.chunks
					.map(chunk => {
						return chunk.id !== null ? chunk.id : "";
					})
					.join(",")) ||
				""
		);
		super.updateHash(hash);
	}

	disconnect() {
		this.chunkGroup = undefined;
		super.disconnect();
	}

	unseal() {
		this.chunkGroup = undefined;
		super.unseal();
	}

	sortItems() {
		super.sortItems();
	}
};
