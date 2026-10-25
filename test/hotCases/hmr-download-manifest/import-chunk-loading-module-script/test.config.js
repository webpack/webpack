"use strict";

module.exports = {
	/**
	 * @param {import("../../../harness/runner").TestRunner["_moduleScope"]} scope module scope
	 * @param {import("../../../../").Configuration} options webpack options
	 */
	moduleScope(scope, options) {
		require("../module-chunk-loading-browser/test.config").moduleScope(
			scope,
			options
		);
		scope.moduleMeta = { url: scope.manifestState.baseURL.href };
	}
};
