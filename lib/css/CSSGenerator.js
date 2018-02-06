/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");

class CSSGenerator {
	generate(module, { dependencyTemplates, moduleGraph }) {
		const source = module.originalSource();

		if (!source) {
			return new RawSource("throw new Error('No source available');");
		}

		for (const dependency of module.dependencies) {
			this.sourceDependency(source, dependency, {
				dependencyTemplates,
				moduleGraph
			});
		}

		return source;
	}

	sourceDependency(source, dependency, { dependencyTemplates, moduleGraph }) {
		const template = dependencyTemplates.get(dependency.constructor);

		if (!template) {
			throw new Error(
				"No template for dependency: " + dependency.constructor.name
			);
		}

		return template.apply(source, { dependency, moduleGraph });
	}
}

module.exports = CSSGenerator;
