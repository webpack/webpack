import { createRequire } from "module";

/** @import { Bench } from "tinybench" */

const require = createRequire(import.meta.url);

const { minify, transform } = require("minimizer-webpack-plugin/dist/minify");
const serialize = require("minimizer-webpack-plugin/dist/serialize-javascript");
const { jsMinify } = require("../../../lib/index.js").javascript;

const implementationPath = {
	path: require.resolve("../../../lib/javascript/jsMinify.js")
};
const input = "function add(a, b) { return a + b; } console.log(add(1, 2));";
const options = {
	name: "bundle.js",
	input,
	minimizer: {
		implementation: jsMinify,
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

/** @param {Bench} bench benchmark suite */
export default (bench) => {
	bench.add(
		'unit benchmark "js-minimizer-plugin-unit", minify entry by module path',
		async () => {
			await minify(pathOptions);
		}
	);
	bench.add(
		'unit benchmark "js-minimizer-plugin-unit", transform entry by function source',
		async () => {
			await transform(serialize(options));
		}
	);
};
