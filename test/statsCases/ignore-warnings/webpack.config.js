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
		warning => warning.module.identifier().endsWith("?2")
	]
};
