"use strict";

const http = require("http");
const {
	experiments: {
		hmr: { LazyCompilationPlugin }
	}
} = require("../../../../");

/**
 * Hands the lazy compilation backend a server that is already listening, as a
 * development server does, and answers every other url itself.
 */
class SharedServerPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const server = http.createServer((req, res) => {
			res.end("shared");
		});
		LazyCompilationPlugin.getCompilerHooks(compiler).backendOptions.tapPromise(
			"SharedServerPlugin",
			(options) =>
				new Promise((resolve, reject) => {
					server.once("error", reject);
					server.listen(0, "127.0.0.1", () => {
						resolve({ ...options, server: () => server });
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

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false
		}
	},
	plugins: [new SharedServerPlugin()]
};
