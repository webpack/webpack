"use strict";

const http = require("http");
// eslint-disable-next-line import-x/no-extraneous-dependencies -- webpack self-reference
const webpack = require("webpack");

/** @import { Compiler } from "../../../../" */
/** @import { AddressInfo } from "net" */
/** @import { LazyCompilationBackendOptions } from "../../../../lib/hmr/LazyCompilationPlugin.js" */
/** @import { Configuration } from "webpack" */

const {
	hmr: { LazyCompilationPlugin }
} = webpack;

/**
 * Hands the lazy compilation backend a server that is already listening, as a
 * development server does, and answers every other url itself.
 */
class SharedServerPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const server = http.createServer((req, res) => {
			res.end("shared");
		});
		LazyCompilationPlugin.getCompilerHooks(compiler).transport.tapPromise(
			"SharedServerPlugin",
			(transport) =>
				new Promise((resolve, reject) => {
					server.once("error", reject);
					server.listen(0, "127.0.0.1", () => {
						const { port } = /** @type {AddressInfo} */ (server.address());
						resolve({
							.../** @type {LazyCompilationBackendOptions} */ (transport),
							server,
							urlBase: `http://127.0.0.1:${port}/`
						});
					});
				})
		);
		// After the backend's own dispose, which must leave the server listening.
		compiler.hooks.shutdown.tapAsync(
			{ name: "SharedServerPlugin", stage: 100 },
			(callback) => {
				if (!server.listening) {
					return callback(new Error("the shared server is not listening"));
				}
				if (server.closeAllConnections) server.closeAllConnections();
				server.close(() => callback());
			}
		);
	}
}

/** @returns {Configuration} configuration with a shared server */
module.exports = () => ({
	experiments: {
		lazyCompilation: {
			entries: false
		}
	},
	plugins: [new SharedServerPlugin()]
});
