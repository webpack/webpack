/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const makeSerializable = require("../util/makeSerializable");

class ContainerExposedDependency extends ModuleDependency {
	/**
	 * @param {string} exposedName public name
	 * @param {string} request request to module
	 */
	constructor(exposedName, request) {
		super(request);
		this.exposedName = exposedName;
	}

	get type() {
		return "container exposed";
	}

	get category() {
		return "esm";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `exposed dependency ${this.exposedName}=${this.request}`;
	}

	serialize(context) {
		context.write(this.exposedName);
		super.serialize(context);
	}

	deserialize(context) {
		this.exposedName = context.read();
		super.deserialize(context);
	}
}

makeSerializable(
	ContainerExposedDependency,
	"webpack/lib/container/ContainerExposedDependency"
);

module.exports = ContainerExposedDependency;
