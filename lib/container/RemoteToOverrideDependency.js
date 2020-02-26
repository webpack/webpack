/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class RemoteToOverrideDependency extends ModuleDependency {
	constructor(request, overrides) {
		super(request);
		this.overrides = overrides;
	}

	get type() {
		return "remote to override";
	}

	serialize(context) {
		context.write(this.overrides);
		super.serialize(context);
	}

	deserialize(context) {
		this.overrides = context.read();
		super.deserialize(context);
	}
}

makeSerializable(
	RemoteToOverrideDependency,
	"webpack/lib/container/RemoteToOverrideDependency"
);

module.exports = RemoteToOverrideDependency;
