/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		module: true,
		filename: "[name].js"
	},
	entry: {
		a: "./a",
		main: "./index"
	},
	optimization: {
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	},
	externalsType: "module-import",
	externals: [
		function (
			{ context, request, contextInfo, getResolve, dependencyType },
			callback
		) {
			if (request === "external2") {
				return callback(null, "node-commonjs external2");
			}
			callback();
		},
		{
			external0: "external0",
			external1: "external1",
			external3: "external3",
			fs: "commonjs fs",
			path: "commonjs path"
		}
	]
};
