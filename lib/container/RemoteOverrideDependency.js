/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("./RemoteOverridesModule").OverrideOptions} OverrideOptions */

class RemoteOverrideDependency extends ModuleDependency {
	/**
	 *
	 * @param {string} request request string
	 */
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
