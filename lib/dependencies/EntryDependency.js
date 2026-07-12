/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";

class EntryDependency extends ModuleDependency {
	/**
	 * Creates an instance of EntryDependency.
	 * @param {string} request request path for entry
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "entry";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(EntryDependency, "webpack/lib/dependencies/EntryDependency");

export default EntryDependency;

export { EntryDependency as "module.exports" };
