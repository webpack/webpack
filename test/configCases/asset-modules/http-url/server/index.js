const http = require("http");
const fs = require("fs");

/**
 * @param {number} port port
 * @returns {Promise<import("http").Server>} server instance
 */
function createServer(port) {
	const file = fs.readFileSync("./test/configCases/asset-modules/http-url/server/index.css").toString().trim();

	const server = http.createServer((req, res) => {
		if (req.url !== "/index.css") {
			res.statusCode = 404;
			res.end();
		} else {
			res.end(file);
		}
	});

	return new Promise((resolve, reject) => {
		server.listen(port, (err) => {
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
		const serverPromise = createServer(this.port);

		serverPromise
			.then(server => server.unref());

		compiler.hooks.done.tapAsync("ServerPlugin", (stats, callback) => {
			serverPromise
				.then(server => server.close(callback))
				.catch(callback)
		});

		compiler.hooks.beforeRun.tapAsync("ServerPlugin", (compiler, callback) => {
			serverPromise
				.then(() => callback())
				.catch(callback)
		});
	}
}

module.exports = ServerPlugin;
