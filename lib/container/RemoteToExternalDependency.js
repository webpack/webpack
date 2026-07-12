/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleDependency from "../dependencies/ModuleDependency.js";
import makeSerializable from "../util/makeSerializable.js";

class RemoteToExternalDependency extends ModuleDependency {
	/**
	 * Creates an instance of RemoteToExternalDependency.
	 * @param {string} request request
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "remote to external";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	RemoteToExternalDependency,
	"webpack/lib/container/RemoteToExternalDependency"
);

export default RemoteToExternalDependency;

export { RemoteToExternalDependency as "module.exports" };
