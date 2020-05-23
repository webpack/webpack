/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class ProvideDependency extends Dependency {
	constructor(shareScope, name, version, request) {
		super();
		this.shareScope = shareScope;
		this.name = name;
		this.version = version;
		this.request = request;
	}

	get type() {
		return "provide module";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `provide module (${this.shareScope}) ${this.request} as ${this.name} @ ${this.version}`;
	}

	serialize(context) {
		context.write(this.shareScope);
		context.write(this.name);
		context.write(this.request);
		context.write(this.version);
		super.serialize(context);
	}

	deserialize(context) {
		this.shareScope = context.read();
		this.name = context.read();
		this.request = context.read();
		this.version = context.read();
		super.deserialize(context);
	}
}

makeSerializable(ProvideDependency, "webpack/lib/sharing/ProvideDependency");

module.exports = ProvideDependency;
