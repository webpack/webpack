/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlockVariable = require("./DependenciesBlockVariable");

function iterationOfArrayCallback(arr, fn) {
	for(var index = 0; index < arr.length; index++) {
		fn(arr[index]);
	}
}

function DependenciesBlock() {
	this.dependencies = [];
	this.blocks = [];
	this.variables = [];
}
module.exports = DependenciesBlock;

DependenciesBlock.prototype.addBlock = function(block) {
	this.blocks.push(block);
	block.parent = this;
};

DependenciesBlock.prototype.addVariable = function(name, expression, dependencies) {
	for(var i = 0; i < this.variables.length; i++) {
		var v = this.variables[i];
		if(v.name === name && v.expression === expression) return;
	}
	this.variables.push(new DependenciesBlockVariable(name, expression, dependencies));
};

DependenciesBlock.prototype.addDependency = function(dependency) {
	this.dependencies.push(dependency);
};

DependenciesBlock.prototype.updateHash = function(hash) {
	var dependencies = this.dependencies;
	for(var indexDep = 0; indexDep < dependencies.length; indexDep++) {
		dependencies[indexDep].updateHash(hash);
	}

	var blocks = this.blocks;
	for(var indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
		blocks[indexBlock].updateHash(hash);
	}

	var variables = this.variables;
	for(var indexVariable = 0; indexVariable < variables.length; indexVariable++) {
		variables[indexVariable].updateHash(hash);
	}
};

DependenciesBlock.prototype.disconnect = function() {
	function disconnect(i) {
		i.disconnect();
	}

	iterationOfArrayCallback(this.dependencies, disconnect);
	iterationOfArrayCallback(this.blocks, disconnect);
	iterationOfArrayCallback(this.variables, disconnect);
};

DependenciesBlock.prototype.unseal = function() {
	function unseal(i) {
		i.unseal();
	}

	iterationOfArrayCallback(this.blocks, unseal);
};

DependenciesBlock.prototype.hasDependencies = function(filter) {
	if(filter) {
		if(this.dependencies.some(filter)) return true;
	} else {
		if(this.dependencies.length > 0) return true;
	}

	return this.blocks.concat(this.variables).some(function(item) {
		return item.hasDependencies(filter);
	});
};

DependenciesBlock.prototype.sortItems = function() {
	var blocks = this.blocks;
	for(var indexBlock = 0; indexBlock < blocks.length; indexBlock++) {
		blocks[indexBlock].sortItems();
	}
};
