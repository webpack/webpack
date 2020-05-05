/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class OverridableOriginalDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "overridable original";
	}
}

makeSerializable(
	OverridableOriginalDependency,
	"webpack/lib/container/OverridableOriginalDependency"
);

module.exports = OverridableOriginalDependency;
