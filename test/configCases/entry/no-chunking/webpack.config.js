/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a.js",
		b: {
			import: "./b.js",
			chunkLoading: false
		},
		c: {
			import: "./b.js",
			asyncChunks: false
		},
		d: {
			import: "./b.js",
			asyncChunks: false,
			runtime: "runtime"
		}
	},
	output: {
		filename: "[name].js"
	},
	target: "web",
	externals: {
		fs: "commonjs fs"
	},
	node: {
		__filename: false
	}
};
