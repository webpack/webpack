"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const DependenciesBlockVariable = require("./DependenciesBlockVariable");
class DependenciesBlock {
	constructor() {
		this.dependencies = [];
		this.blocks = [];
		this.variables = [];
	}

	addBlock(block) {
		this.blocks.push(block);
		block.parent = this;
	}

	addVariable(name, expression, dependencies) {
		for(let v of this.variables) {
			if(v.name === name && v.expression === expression) {
				return;
			}
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

	hasDependencies() {
		return this.dependencies.length > 0
			|| this.blocks.concat(this.variables)
				.some(item => item.hasDependencies());
	}

	sortItems() {
		this.blocks.forEach(block => {
			block.sortItems();
		});
	}
}
module.exports = DependenciesBlock;
