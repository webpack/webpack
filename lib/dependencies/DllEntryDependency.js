/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class DllEntryDependency extends Dependency {
	constructor(dependencies, name) {
		super();

		this.dependencies = dependencies;
		this.name = name;
	}

	get type() {
		return "dll entry";
	}

	serialize(context) {
		const { write } = context;

		write(this.dependencies);
		write(this.name);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.dependencies = read();
		this.name = read();

		super.deserialize(context);
	}
}

makeSerializable(
	DllEntryDependency,
	"webpack/lib/dependencies/DllEntryDependency"
);

module.exports = DllEntryDependency;
