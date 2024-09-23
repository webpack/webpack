/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	entry: {
		main: "./index",
		other: "./other"
	},
	externalsType: {
		"static-import": "commonjs",
		"dynamic-import": "import",
		fallback: "window"
	},
	externals: {
		external1: "external111",
		external2: "external222",
		external3: "external333",
		fs: "commonjs fs",
		path: "commonjs path"
	},
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false
	}
};
