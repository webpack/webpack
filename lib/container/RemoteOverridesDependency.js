/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class RemoteOverridesDependency extends Dependency {
	constructor(overrides) {
		super();
		this.overrides = overrides;
	}

	get type() {
		return "remote overrides";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `remote overrides ${this.overrides
			.map(([key, request]) => `${key}=${request}`)
			.join()}`;
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
	RemoteOverridesDependency,
	"webpack/lib/container/RemoteOverridesDependency"
);

module.exports = RemoteOverridesDependency;
