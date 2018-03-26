/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");

class DependenciesBlockVariable {
	constructor(name, expression, dependencies) {
		this.name = name;
		this.expression = expression;
		this.dependencies = dependencies || [];
	}

	updateHash(hash) {
		hash.update(this.name);
		hash.update(this.expression);
		for (const d of this.dependencies) {
			d.updateHash(hash);
		}
	}

	expressionSource(dependencyTemplates, runtimeTemplate) {
		const source = new ReplaceSource(new RawSource(this.expression));
		for (const dep of this.dependencies) {
			const template = dependencyTemplates.get(dep.constructor);
			if (!template)
				throw new Error(`No template for dependency: ${dep.constructor.name}`);
			template.apply(dep, source, runtimeTemplate, dependencyTemplates);
		}
		return source;
	}

	disconnect() {
		for (const d of this.dependencies) {
			d.disconnect();
		}
	}

	hasDependencies(filter) {
		if (filter) {
			if (this.dependencies.some(filter)) return true;
		} else {
			if (this.dependencies.length > 0) return true;
		}
		return false;
	}
}

module.exports = DependenciesBlockVariable;
