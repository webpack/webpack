/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import AsyncDependenciesBlock from "../AsyncDependenciesBlock.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */

class AMDRequireDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * Creates an instance of AMDRequireDependenciesBlock.
	 * @param {DependencyLocation} loc location info
	 * @param {string=} request request
	 */
	constructor(loc, request) {
		super(null, loc, request);
	}
}

makeSerializable(
	AMDRequireDependenciesBlock,
	"webpack/lib/dependencies/AMDRequireDependenciesBlock"
);

export default AMDRequireDependenciesBlock;

export { AMDRequireDependenciesBlock as "module.exports" };
