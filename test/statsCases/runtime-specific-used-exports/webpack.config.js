const entry = {
	a: "./a",
	b: "./b",
	c: "./c"
};

const stats = {
	usedExports: true,
	chunks: true,
	chunkModules: true,
	dependentModules: true,
	modules: true,
	orphanModules: true,
	nestedModules: true
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: "production",
		mode: "production",
		output: {
			filename: "production-[name].js"
		},
		optimization: {
			concatenateModules: false,
			chunkIds: "named"
		},
		entry,
		stats
	},
	{
		name: "development",
		mode: "development",
		output: {
			filename: "development-[name].js"
		},
		optimization: {
			concatenateModules: false,
			chunkIds: "named"
		},
		entry,
		stats
	},
	{
		name: "global",
		mode: "production",
		output: {
			filename: "global-[name].js"
		},
		optimization: {
			concatenateModules: false,
			chunkIds: "named",
			usedExports: "global"
		},
		entry,
		stats
	}
];
