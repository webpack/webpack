/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class ConsumeFallbackDependency extends ModuleDependency {
	constructor(request) {
		super(request);
	}

	get type() {
		return "consume fallback";
	}
}

makeSerializable(
	ConsumeFallbackDependency,
	"webpack/lib/sharing/ConsumeFallbackDependency"
);

module.exports = ConsumeFallbackDependency;
