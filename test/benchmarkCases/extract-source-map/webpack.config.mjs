/** @type {import("../../..").Configuration} */
export default {
	entry: "./generated/module.js",
	target: "node",
	devtool: "source-map",
	module: { rules: [{ extractSourceMap: true }] },
	output: { library: { type: "commonjs2" } }
};
