/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DependenciesBlockVariable = require("./DependenciesBlockVariable");

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
	this.dependencies.forEach(function(d) {
		d.updateHash(hash);
	});
	this.blocks.forEach(function(b) {
		b.updateHash(hash);
	});
	this.variables.forEach(function(v) {
		v.updateHash(hash);
	});
};

DependenciesBlock.prototype.disconnect = function() {
	function disconnect(i) {
		i.disconnect();
	}
	this.dependencies.forEach(disconnect);
	this.blocks.forEach(disconnect);
	this.variables.forEach(disconnect);
};

DependenciesBlock.prototype.hasDependencies = function() {
	return this.dependencies.length > 0 ||
		this.blocks.concat(this.variables).some(function(item) {
			return item.hasDependencies();
		});
};
