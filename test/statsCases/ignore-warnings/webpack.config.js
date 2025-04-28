/** @typedef {import("../../../").WebpackError} WebpackError */

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	ignoreWarnings: [
		{
			module: /module2\.js\?[34]/
		},
		{
			module: /[13]/,
			message: /homepage/
		},
		/The 'mode' option has not been set/,
		warning =>
			/** @type {WebpackError} */ (warning).module.identifier().endsWith("?2")
	]
};
