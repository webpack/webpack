/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const DependenciesBlock = require("./DependenciesBlock");

module.exports = class AsyncDependenciesBlock extends DependenciesBlock {
	constructor(name, module, loc) {
		super();
		this.chunkName = name;
		this.chunks = null;
		this.module = module;
		this.loc = loc;
	}
	get chunk() {
		throw new Error("`chunk` was been renamed to `chunks` and is now an array");
	}
	set chunk(chunk) {
		throw new Error("`chunk` was been renamed to `chunks` and is now an array");
	}
	updateHash(hash) {
		hash.update(this.chunkName || "");
		hash.update(this.chunks && this.chunks.map((chunk) => {
			return chunk.id !== null ? chunk.id : "";
		}).join(",") || "");
		super.updateHash(hash);
	}
	disconnect() {
		this.chunks = null;
		super.disconnect();
	}
	unseal() {
		this.chunks = null;
		super.unseal();
	}
	sortItems() {
		super.sortItems();
		if(this.chunks) {
			this.chunks.sort((a, b) => a.compareTo(b));
		}
	}
};
