/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");

class ModuleHotDeclineDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);

		this.range = range;
		this.weak = true;
	}

	get type() {
		return "module.hot.decline";
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
	ModuleHotDeclineDependency,
	"webpack/lib/dependencies/ModuleHotDeclineDependency"
);

ModuleHotDeclineDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ModuleHotDeclineDependency;
