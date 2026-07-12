/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import AsyncDependenciesBlock from "../AsyncDependenciesBlock.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("../AsyncDependenciesBlock.js").GroupOptions} GroupOptions */
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */

class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * Creates an instance of RequireEnsureDependenciesBlock.
	 * @param {GroupOptions | string | null} chunkName chunk name
	 * @param {(DependencyLocation | null)=} loc location info
	 */
	constructor(chunkName, loc) {
		super(chunkName, loc, null);
	}
}

makeSerializable(
	RequireEnsureDependenciesBlock,
	"webpack/lib/dependencies/RequireEnsureDependenciesBlock"
);

export default RequireEnsureDependenciesBlock;

export { RequireEnsureDependenciesBlock as "module.exports" };
