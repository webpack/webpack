const http = require("http");
const fs = require("fs");

/**
 * @param {number} port port
 * @returns {Promise<import("http").Server>} server instance
 */
function createServer(port) {
	const file = fs
		.readFileSync("./test/configCases/asset-modules/http-url/server/index.css")
		.toString()
		.trim();

	const server = http.createServer((req, res) => {
		if (req.url !== "/index.css") {
			res.statusCode = 404;
			res.end();
		} else {
			res.end(file);
		}
	});

	return new Promise((resolve, reject) => {
		server.listen(port, err => {
			if (err) {
				reject(err);
			} else {
				resolve(server);
			}
		});
	});
}

class ServerPlugin {
	/**
	 * @param {number} port
	 */
	constructor(port) {
		this.port = port;
	}

	/**
	 * @param {import("../../../../../").Compiler} compiler
	 */
	apply(compiler) {
		let server;

		compiler.hooks.beforeRun.tapPromise(
			"ServerPlugin",
			async (compiler, callback) => {
				if (!server) {
					server = await createServer(this.port);
					server.unref();
				}
			}
		);

		compiler.hooks.done.tapAsync("ServerPlugin", (stats, callback) => {
			if (server) {
				server.close(callback);
				server = undefined;
			} else {
				callback();
			}
		});
	}
}

module.exports = ServerPlugin;
