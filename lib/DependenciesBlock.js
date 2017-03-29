/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependenciesBlockVariable = require("./DependenciesBlockVariable");

class DependenciesBlock {
	constructor(dependencies, blocks, variables) {
		this.dependencies = [];
		this.blocks = [];
		this.variables = [];
	}

	addBlock(block) {
		this.blocks.push(block);
		block.parent = this;
	}

	addVariable(name, expression, dependencies) {
		for(let i = 0; i < this.variables.length; i++) {
			let v = this.variables[i];
			if(v.name === name && v.expression === expression) return;
		}
		this.variables.push(new DependenciesBlockVariable(name, expression, dependencies));
	}

	addDependency(dependency) {
		this.dependencies.push(dependency);
	}

	updateHash(hash) {
		this.dependencies.forEach(d => {
			d.updateHash(hash);
		});
		this.blocks.forEach(b => {
			b.updateHash(hash);
		});
		this.variables.forEach(v => {
			v.updateHash(hash);
		});
	}

	disconnect() {
		function disconnect(i) {
			i.disconnect();
		}
		this.dependencies.forEach(disconnect);
		this.blocks.forEach(disconnect);
		this.variables.forEach(disconnect);
	}

	unseal() {
		function unseal(i) {
			i.unseal();
		}
		this.blocks.forEach(unseal);
	}

	hasDependencies(filter) {
		if(filter) {
			if(this.dependencies.some(filter)) return true;
		} else {
			if(this.dependencies.length > 0) return true;
		}

		return this.blocks.concat(this.variables).some(item => {
			return item.hasDependencies(filter);
		});
	}

	sortItems() {
		this.blocks.forEach(block => {
			block.sortItems();
		});
	}
}

module.exports = DependenciesBlock;
