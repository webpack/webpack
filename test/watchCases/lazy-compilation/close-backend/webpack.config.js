"use strict";

const http = require("http");

/**
 * @returns {import("webpack").Configuration} watch configuration
 */
module.exports = () => {
	let port = 0;
	const plugin = {
		/** @type {(() => Promise<void>) | undefined} */
		run: undefined,
		/**
		 * @param {import("webpack").Compiler} compiler watched compiler
		 * @returns {void}
		 */
		apply(compiler) {
			compiler.hooks.done.tap("CloseBackend", () => {
				plugin.run = async () => {
					await new Promise((resolve, reject) => {
						compiler.close((error) =>
							error ? reject(error) : resolve(undefined)
						);
					});
					const replacement = http.createServer();
					try {
						await new Promise((resolve, reject) => {
							replacement.once("error", reject);
							replacement.listen(port, "127.0.0.1", () => resolve(undefined));
						});
					} finally {
						await new Promise((resolve) => {
							replacement.close(() => resolve(undefined));
						});
					}
				};
			});
		}
	};
	return {
		mode: "development",
		experiments: {
			lazyCompilation: {
				entries: false,
				imports: false,
				backend: async () => {
					const server = http.createServer();
					await new Promise((resolve, reject) => {
						server.once("error", reject);
						server.listen(0, "127.0.0.1", () => resolve(undefined));
					});
					port = /** @type {import("net").AddressInfo} */ (server.address())
						.port;
					return {
						module: () => ({ client: "", data: "", active: false }),
						dispose: (/** @type {(error?: Error | null) => void} */ done) => {
							setImmediate(() => server.close(done));
						}
					};
				}
			}
		},
		plugins: [plugin]
	};
};
