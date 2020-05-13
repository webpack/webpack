/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

class EntryDependency extends ModuleDependency {
	/**
	 * @param {string} request request path for entry
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "entry";
	}

	serialize(context) {
		super.serialize(context);
	}

	deserialize(context) {
		super.deserialize(context);
	}
}

makeSerializable(EntryDependency, "webpack/lib/dependencies/EntryDependency");

module.exports = EntryDependency;
