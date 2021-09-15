const entry = {
	a: "./a",
	b: "./b",
	c: "./c"
};
const stats = {
	chunks: true
};

/** @type {import("../../../").Configuration} */
module.exports = [
	{
		name: "used-exports",
		mode: "production",
		output: {
			filename: "used-exports-[name].js"
		},
		entry,
		optimization: {
			splitChunks: {
				minSize: 0,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "no-used-exports",
		mode: "production",
		output: {
			filename: "no-used-exports-[name].js"
		},
		entry,
		optimization: {
			splitChunks: {
				minSize: 0,
				chunks: "all",
				usedExports: false
			}
		},
		stats
	},
	{
		name: "global",
		mode: "production",
		output: {
			filename: "global-[name].js"
		},
		entry,
		optimization: {
			splitChunks: {
				minSize: 0,
				chunks: "all"
			},
			usedExports: "global"
		},
		stats
	}
];
