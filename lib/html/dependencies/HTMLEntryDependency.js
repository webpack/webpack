/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../../dependencies/ModuleDependency");
const DependencyReference = require("../../dependencies/DependencyReference");

class HTMLEntryDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return "html entry";
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

HTMLEntryDependency.Template = class HTMLEntryDependencyTemplate {
	apply(dependency, source, templateContext) {}
};

module.exports = HTMLEntryDependency;
