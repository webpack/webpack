/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class OverridableOriginalDependency extends Dependency {
	constructor(originalModule) {
		super();
		this.originalModule = originalModule;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return this.originalModule.identifier();
	}

	get type() {
		return "overridable original";
	}

	serialize(context) {
		context.write(this.originalModule);
		super.serialize(context);
	}

	deserialize(context) {
		this.originalModule = context.read();
		super.deserialize(context);
	}
}

makeSerializable(
	OverridableOriginalDependency,
	"webpack/lib/container/OverridableOriginalDependency"
);

module.exports = OverridableOriginalDependency;
