/** @type {import("../../../types.d.ts").Configuration} */
export default {
	entry: "./index",
	target: "node",
	optimization: {
		avoidEntryIife: false,
		// terser is very slow on typescript code, need to investigate
		minimize: false
	},
	ignoreWarnings: [/Critical dependency/]
};
