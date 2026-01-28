const http = require("http");
const fs = require("fs");
const path = require("path");

/** @typedef {import("../../../../../").Compiler} Compiler */

/**
 * @returns {import("http").Server} server instance
 */
function createServer() {
	const server = http.createServer((req, res) => {
		let file;
		const pathname = "." + /** @type {string} */ (req.url).replace(/\?.*$/, "");
		if (/** @type {string} */ (req.url).endsWith("?no-cache")) {
			res.setHeader("Cache-Control", "no-cache, max-age=60");
		} else {
			res.setHeader("Cache-Control", "public, immutable, max-age=600");
		}
		try {
			file = fs
				.readFileSync(path.resolve(__dirname, pathname))
				.toString()
				.replace(/\r\n?/g, "\n")
				.trim();
		} catch (e) {
			if (fs.existsSync(path.resolve(__dirname, pathname + ".js"))) {
				res.statusCode = 301;
				res.setHeader("Location", pathname.slice(1) + ".js");
				res.end();
				return;
			}
			res.statusCode = 404;
			res.end();
			return;
		}
		res.setHeader(
			"Content-Type",
			pathname.endsWith(".js") ? "text/javascript" : "text/css"
		);
		res.end(file);
	});
	server.unref();
	return server;
}

class ServerPlugin {
	/**
	 * @param {number} port
	 */
	constructor(port) {
		this.port = port;
		this.refs = 0;
		this.server = undefined;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.beforeRun.tapPromise(
			"ServerPlugin",
			async () => {
				this.refs++;
				if (!this.server) {
					this.server = createServer();
					await new Promise(
						/**
						 * @param {(value: void) => void} resolve resolve
						 * @param {(reason?: Error) => void} _reject reject
						 */
						(resolve, _reject) => {
							/** @type {import("http").Server} */
							(this.server).listen(
								this.port,
								() => {
									resolve();
								}
							);
					});
				}
			}
		);

		compiler.hooks.done.tapAsync("ServerPlugin", (stats, callback) => {
			const s = this.server;
			if (s && --this.refs === 0) {
				this.server = undefined;
				s.close(callback);
			} else {
				callback();
			}
		});
	}
}

module.exports = ServerPlugin;
