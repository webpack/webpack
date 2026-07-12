/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import NullDependency from "./NullDependency.js";

class RequireEnsureItemDependency extends ModuleDependency {
	/**
	 * Creates an instance of RequireEnsureItemDependency.
	 * @param {string} request the request string
	 */
	constructor(request) {
		super(request);
	}

	get type() {
		return "require.ensure item";
	}

	get category() {
		return "commonjs";
	}
}

makeSerializable(
	RequireEnsureItemDependency,
	"webpack/lib/dependencies/RequireEnsureItemDependency"
);

RequireEnsureItemDependency.Template = NullDependency.Template;

export default RequireEnsureItemDependency;

export { RequireEnsureItemDependency as "module.exports" };
