/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const EntryDependency = require("../dependencies/EntryDependency");
const makeSerializable = require("../util/makeSerializable");

class ContainerEntryDependency extends EntryDependency {
	/**
	 * @param {[string, string][]} exposes list of exposed modules
	 */
	constructor(exposes) {
		super(null);
		this.exposes = exposes;
		this.optional = true;
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
