const HookWebpackError = require('../../../../lib/errors/HookWebpackError.js');

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader() {
	const callback = this.async();

	callback(new HookWebpackError(new Error("Error: test"), "hookName"));
};

