/** @type {import("../../../../").Configuration} */
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

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "module-entryIife-false",
		output: {
			filename: "module-entryIife-false.mjs"
		},
		optimization: {
			...base.optimization,
			entryIife: false
		}
	},
	{
		...base,
		name: "module-entryIife-true",
		output: {
			filename: "module-entryIife-true.mjs"
		},
		optimization: {
			...base.optimization,
			entryIife: true
		}
	}
];
