/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class RemoteOverrideDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "remote override";
	}
}

makeSerializable(
	RemoteOverrideDependency,
	"webpack/lib/container/RemoteOverrideDependency"
);

module.exports = RemoteOverrideDependency;
