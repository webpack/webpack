/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	target: "node",
	optimization: {
		avoidEntryIife: false,
		// terser is very slow on typescript code, need to investigate
		minimize: false
	},
	ignoreWarnings: [/Critical dependency/]
};
