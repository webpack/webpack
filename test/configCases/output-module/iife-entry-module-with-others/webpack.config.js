/** @type {import("../../../../types").Configuration} */
const base = {
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	},
	target: "es2020"
};

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		...base,
		name: "module-avoidEntryIife-false",
		output: {
			filename: "module-avoidEntryIife-false.mjs"
		},
		optimization: {
			...base.optimization,
			avoidEntryIife: false
		}
	},
	{
		...base,
		name: "module-avoidEntryIife-true",
		output: {
			filename: "module-avoidEntryIife-true.mjs"
		},
		optimization: {
			...base.optimization,
			avoidEntryIife: true
		}
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
