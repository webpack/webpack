/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyAsId = require("./ModuleDependencyTemplateAsId");

class RequireResolveDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);

		this.range = range;
	}

	get type() {
		return "require.resolve";
	}

	serialize(context) {
		const { write } = context;

		write(this.range);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.range = read();

		super.deserialize(context);
	}
}

makeSerializable(
	RequireResolveDependency,
	"webpack/lib/dependencies/RequireResolveDependency"
);

RequireResolveDependency.Template = ModuleDependencyAsId;

module.exports = RequireResolveDependency;
