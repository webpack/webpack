"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

module.exports = {
	/**
	 * @param {import("../../../harness/runner").TestRunner["_moduleScope"]} scope module scope
	 * @param {import("../../../../").Configuration} options webpack options
	 */
	moduleScope(scope, options) {
		const state = {
			baseURL: pathToFileURL(path.join(options.output.path, "bundle.mjs")),
			error: undefined,
			fetchError: undefined,
			status: 404,
			requests: []
		};
		scope.manifestState = state;
		scope.fetch = (url, options) => {
			state.requests.push({ url: String(url), method: options.method });
			return state.fetchError
				? Promise.reject(state.fetchError)
				: Promise.resolve({ status: state.status });
		};
	}
};
