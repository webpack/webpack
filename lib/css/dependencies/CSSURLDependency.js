/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../../dependencies/ModuleDependency");
const DependencyReference = require("../../dependencies/DependencyReference");

class CSSURLDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return "css url";
	}

	getReference(moduleGraph) {
		if (!moduleGraph.getModule(this)) {
			return null;
		}

		return new DependencyReference(
			() => moduleGraph.getModule(this),
			false,
			this.weak,
			this.sourceOrder
		);
	}
}

CSSURLDependency.Template = class CSSURLDependencyTemplate {
	apply(source, { dependency, moduleGraph }) {
		const module = moduleGraph.getModule(dependency);

		if (module.buildInfo.assets) {
			source._value = source._value.replace(
				dependency.name,
				// TODO(michael-ciniawsky)
				// Honor config.output.publicPath
				`'/${Object.keys(module.buildInfo.assets)[0]}'`
			);
		}

		return source;
	}
};

module.exports = CSSURLDependency;
