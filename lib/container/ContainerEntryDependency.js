/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");

class ContainerEntryDependency extends Dependency {
	/**
	 * @param {string} name entry name
	 * @param {[string, string][]} exposes list of exposed modules
	 */
	constructor(name, exposes) {
		super();
		this.name = name;
		this.exposes = exposes;
		this.optional = true;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `container-entry-${this.name}`;
	}

	get type() {
		return "container entry";
	}
}

makeSerializable(
	ContainerEntryDependency,
	"webpack/lib/container/ContainerEntryDependency"
);

module.exports = ContainerEntryDependency;
