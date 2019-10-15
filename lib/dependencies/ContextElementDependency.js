/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

class ContextElementDependency extends ModuleDependency {
	constructor(request, userRequest) {
		super(request);

		if (userRequest) {
			this.userRequest = userRequest;
		}
	}

	get type() {
		return "context element";
	}

	serialize(context) {
		const { write } = context;

		write(this.userRequest);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.userRequest = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ContextElementDependency,
	"webpack/lib/dependencies/ContextElementDependency"
);

module.exports = ContextElementDependency;
