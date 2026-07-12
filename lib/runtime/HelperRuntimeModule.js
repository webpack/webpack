/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import RuntimeModule from "../RuntimeModule.js";

/**
 * Base class for runtime modules that only emit helper functions and do not
 * need special staging or attachment behavior beyond `RuntimeModule`.
 */
class HelperRuntimeModule extends RuntimeModule {
	/**
	 * Creates a helper runtime module with the provided readable name.
	 * @param {string} name a readable name
	 */
	constructor(name) {
		super(name);
	}
}

export default HelperRuntimeModule;

export { HelperRuntimeModule as "module.exports" };
