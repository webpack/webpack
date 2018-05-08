/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

const DependenciesBlockVariable = require("./DependenciesBlockVariable");

/** @typedef {import("./ChunkGroup")} ChunkGroup */

class DependenciesBlock {
	constructor() {
		this.dependencies = [];
		this.blocks = [];
		this.variables = [];
		// TODO remove this line, it's wrong
		/** @type {ChunkGroup=} */
		this.chunkGroup = undefined;
	}

	addBlock(block) {
		this.blocks.push(block);
		block.parent = this;
	}

	addVariable(name, expression, dependencies) {
		for (let v of this.variables) {
			if (v.name === name && v.expression === expression) {
				return;
			}
		}
		this.variables.push(
			new DependenciesBlockVariable(name, expression, dependencies)
		);
	}

	addDependency(dependency) {
		this.dependencies.push(dependency);
	}

	removeDependency(dependency) {
		const idx = this.dependencies.indexOf(dependency);
		if (idx >= 0) this.dependencies.splice(idx, 1);
	}

	updateHash(hash) {
		for (const dep of this.dependencies) dep.updateHash(hash);
		for (const block of this.blocks) block.updateHash(hash);
		for (const variable of this.variables) variable.updateHash(hash);
	}

	disconnect() {
		for (const dep of this.dependencies) dep.disconnect();
		for (const block of this.blocks) block.disconnect();
		for (const variable of this.variables) variable.disconnect();
	}

	unseal() {
		for (const block of this.blocks) block.unseal();
	}

	hasDependencies(filter) {
		if (filter) {
			for (const dep of this.dependencies) {
				if (filter(dep)) return true;
			}
		} else {
			if (this.dependencies.length > 0) {
				return true;
			}
		}

		for (const block of this.blocks) {
			if (block.hasDependencies(filter)) return true;
		}
		for (const variable of this.variables) {
			if (variable.hasDependencies(filter)) return true;
		}
		return false;
	}

	sortItems() {
		for (const block of this.blocks) block.sortItems();
	}
}

module.exports = DependenciesBlock;
