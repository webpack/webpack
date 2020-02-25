/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const EntryDependency = require("../dependencies/EntryDependency");
const makeSerializable = require("../util/makeSerializable");

class ContainerEntryDependency extends EntryDependency {
	constructor(exposes, name) {
		super(null);
		this.exposes = exposes;
		this.optional = true;
		this.loc = { name };
	}
}

makeSerializable(
	ContainerEntryDependency,
	"webpack/lib/container/ContainerEntryDependency"
);

module.exports = ContainerEntryDependency;
