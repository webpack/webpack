/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const DependenciesBlock = require("./DependenciesBlock");

module.exports = class AsyncDependenciesBlock extends DependenciesBlock {
	constructor(name, module, loc, request) {
		super();
		this.chunkName = name;
		this.chunkGroup = undefined;
		this.module = module;
		this.loc = loc;
		this.request = request;
	}

	get chunks() {
		throw new Error("Moved to AsyncDependenciesBlock.chunkGroup");
	}

	set chunks(value) {
		throw new Error("Moved to AsyncDependenciesBlock.chunkGroup");
	}

	updateHash(hash) {
		hash.update(this.chunkName || "");
		hash.update(this.chunkGroup && this.chunkGroup.chunks.map(chunk => {
			return chunk.id !== null ? chunk.id : "";
		}).join(",") || "");
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
