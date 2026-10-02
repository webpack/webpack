import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { minify, transform } = require("minimizer-webpack-plugin/dist/minify");
const serialize = require("minimizer-webpack-plugin/dist/serialize-javascript");
const { terserMinify } = require("minimizer-webpack-plugin/dist/utils");

const implementationPath = {
	path: require.resolve("minimizer-webpack-plugin/dist/utils"),
	export: "terserMinify"
};
const input = "function add(a, b) { return a + b; } console.log(add(1, 2));";
const options = {
	name: "bundle.js",
	input,
	minimizer: {
		implementation: terserMinify,
		options: { compress: true, mangle: true }
	},
	extractComments: false
};
const pathOptions = {
	...options,
	minimizer: {
		...options.minimizer,
		implementation: implementationPath
	}
};

/** @param {import("tinybench").Bench} bench benchmark suite */
export default (bench) => {
	bench.add(
		'unit benchmark "minimizer-module-path-unit", minify entry by module path',
		async () => {
			await minify(pathOptions);
		}
	);
	bench.add(
		'unit benchmark "minimizer-module-path-unit", transform entry by function source',
		async () => {
			await transform(serialize(options));
		}
	);
};
