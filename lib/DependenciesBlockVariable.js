/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ReplaceSource = require("webpack-sources").ReplaceSource;
const RawSource = require("webpack-sources").RawSource;

class DependenciesBlockVariable {
	constructor(name, expression, dependencies) {
		this.name = name;
		this.expression = expression;
		this.dependencies = dependencies || [];
	}

	updateHash(hash) {
		hash.update(this.name);
		hash.update(this.expression);
		this.dependencies.forEach(d => {
			d.updateHash(hash);
		});
	}

	expressionSource(dependencyTemplates, outputOptions, requestShortener) {
		const source = new ReplaceSource(new RawSource(this.expression));
		this.dependencies.forEach(dep => {
			const template = dependencyTemplates.get(dep.constructor);
			if(!template) throw new Error(`No template for dependency: ${dep.constructor.name}`);
			template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
		});
		return source;
	}

	disconnect() {
		this.dependencies.forEach(d => {
			d.disconnect();
		});
	}

	hasDependencies(filter) {
		if(filter) {
			if(this.dependencies.some(filter)) return true;
		} else {
			if(this.dependencies.length > 0) return true;
		}
		return false;
	}
}

module.exports = DependenciesBlockVariable;
