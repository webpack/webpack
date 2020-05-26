/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");

/** @typedef {import("../Dependency").DependencyCategories} DependencyCategories */

class AMDRequireContextDependency extends ContextDependency {
	constructor(options, range, valueRange) {
		super(options);

		this.range = range;
		this.valueRange = valueRange;
	}

	get type() {
		return "amd require context";
	}

	/**
	 * @returns {DependencyCategories} a dependency category
	 */
	get category() {
		return Dependency.Categories.AMD;
	}

	serialize(context) {
		const { write } = context;

		write(this.range);
		write(this.valueRange);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.range = read();
		this.valueRange = read();

		super.deserialize(context);
	}
}

makeSerializable(
	AMDRequireContextDependency,
	"webpack/lib/dependencies/AMDRequireContextDependency"
);

AMDRequireContextDependency.Template = require("./ContextDependencyTemplateAsRequireCall");

module.exports = AMDRequireContextDependency;
