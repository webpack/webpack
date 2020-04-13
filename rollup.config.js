const multi = require("@rollup/plugin-multi-entry");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");

/*
 * the node.js builtin-modules cannot be used.
 *
 * adding cherry-picked polyfills with alias-plugin
 *
 * TODO bridge to deno.land?
 */
// import builtins from 'builtin-modules';
// import nodePolyfills from 'rollup-plugin-node-polyfills';

const alias = require("@rollup/plugin-alias");
const path = require("path");

const rollupCfg = [
	{
		input: {
			include: ["lib/util/makeSerializable.js", "lib/**/*.js"],
			exclude: ["lib/node/**", "**/NodeStuffPlugin.js"]
		},
		output: [
			{
				file: "dist/webpack.esm.js",
				format: "esm"
			}
		],
		plugins: [
			multi({
				exports: false
			}),
			resolve({
				preferBuiltins: false
			}),
			commonjs({
				ignoreGlobal: true
			}),
			alias({
				entries: {
					util: path.resolve("polyfills/util"),
					crypto: path.resolve("polyfills/crypto"),
					path: path.resolve("polyfills/path"),
					fs: path.resolve("polyfills/fs"),
					pnpapi: path.resolve("polyfills/pnpapi"),
					assert: path.resolve("polyfills/assert"),
					vm: path.resolve("polyfills/vm"),
					querystring: path.resolve("polyfills/querystring"),
					module: path.resolve("polyfills/module"),
					os: path.resolve("polyfills/os"),
					stream: path.resolve("polyfills/stream"),
					child_process: path.resolve("polyfills/child_process"),
					worker_threads: path.resolve("polyfills/worker_threads"),
					tty: path.resolve("polyfills/tty"),
					constants: path.resolve("polyfills/constants"),
					buffer: path.resolve("polyfills/buffer"),
					bluebird: path.resolve("polyfills/bluebird"),
					inspector: path.resolve("polyfills/inspector")
				}
			}),
			json()
		],
		external: []
	}
];

module.exports = rollupCfg;
