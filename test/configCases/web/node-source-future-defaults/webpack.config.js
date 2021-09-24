/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		optimization: false,
		experiments: {
			futureDefaults: true
		}
	},
	{
		target: "web",
		optimization: false,
		node: {
			__filename: "mock",
			__dirname: "mock",
			global: "warn"
		}
	},
	{
		target: "web",
		node: {
			__filename: "warn-mock",
			__dirname: "warn-mock",
			global: true
		}
	}
];
