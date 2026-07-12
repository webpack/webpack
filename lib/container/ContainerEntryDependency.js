/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

import Dependency from "../Dependency.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("./ContainerEntryModule.js").ExposesList} ExposesList */

class ContainerEntryDependency extends Dependency {
	/**
	 * Creates an instance of ContainerEntryDependency.
	 * @param {string} name entry name
	 * @param {ExposesList} exposes list of exposed modules
	 * @param {string} shareScope name of the share scope
	 */
	constructor(name, exposes, shareScope) {
		super();
		/** @type {string} */
		this.name = name;
		/** @type {ExposesList} */
		this.exposes = exposes;
		/** @type {string} */
		this.shareScope = shareScope;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `container-entry-${this.name}`;
	}

	get type() {
		return "container entry";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ContainerEntryDependency,
	"webpack/lib/container/ContainerEntryDependency"
);

export default ContainerEntryDependency;

export { ContainerEntryDependency as "module.exports" };
