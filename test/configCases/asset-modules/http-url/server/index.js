const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/**
 * @returns {import("http").Server} server instance
 */
function createServer() {
	const server = http.createServer((req, res) => {
		let file;
		const url = /** @type {string} */ (req.url);
		const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
		// simulate a dropped connection to exercise the fetch error path
		if (query === "error") {
			/** @type {import("net").Socket} */ (res.socket).destroy();
			return;
		}
		// must-revalidate redirect with a stable etag, to exercise the unchanged-redirect path
		if (query === "redirect") {
			res.statusCode = 301;
			res.setHeader("Location", "/resolve.js");
			res.setHeader("ETag", '"stable-redirect"');
			res.setHeader("Cache-Control", "public, must-revalidate");
			res.end();
			return;
		}
		// redirect whose userinfo repeats the request host, to exercise the
		// allowedUris check after a redirect
		if (query === "redirect-userinfo") {
			const { localPort } = /** @type {import("net").Socket} */ (req.socket);
			res.statusCode = 301;
			res.setHeader(
				"Location",
				`http://${req.headers.host}@127.0.0.1:${localPort}/resolve.js`
			);
			res.end();
			return;
		}
		// basic auth from the URL's userinfo, to check credentials still reach the server
		if (
			query === "auth" &&
			req.headers.authorization !==
				`Basic ${Buffer.from("user:tok").toString("base64")}`
		) {
			res.statusCode = 401;
			res.end();
			return;
		}
		// a truncated body under a compressed content-encoding, to exercise the
		// decompression error path
		const invalidEncoding = /^invalid-(gzip|br|deflate)$/.exec(query);
		if (invalidEncoding) {
			res.setHeader(
				"Content-Encoding",
				invalidEncoding[1] === "gzip"
					? "gzip"
					: invalidEncoding[1] === "br"
						? "br"
						: "deflate"
			);
			res.end("this is not compressed data");
			return;
		}
		const pathname = "." + url.replace(/\?.*$/, "");
		// serve only this directory: a `../` in the request would read any file
		if (!path.resolve(__dirname, pathname).startsWith(__dirname + path.sep)) {
			res.statusCode = 403;
			res.end();
			return;
		}
		if (url.endsWith("?no-cache")) {
			res.setHeader("Cache-Control", "no-cache, max-age=60");
		} else if (url.endsWith("?no-store")) {
			// mixed case on purpose: directive names are case-insensitive
			res.setHeader("Cache-Control", "No-Store, MAX-AGE=60");
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
			pathname.endsWith(".js")
				? "text/javascript"
				: pathname.endsWith("LICENSE")
					? "text/plain"
					: "text/css"
		);
		// serve compressed responses to exercise the decompression branches; the
		// `-case` variants send the same coding with non-canonical spelling
		const encodingHeaders = {
			gzip: "gzip",
			br: "br",
			deflate: "deflate",
			"gzip-case": "GZip",
			"br-case": "BR",
			"deflate-case": " Deflate "
		};
		const encodingHeader =
			encodingHeaders[/** @type {keyof typeof encodingHeaders} */ (query)];
		if (encodingHeader) {
			const encoding = query.replace(/-case$/, "");
			res.setHeader("Content-Encoding", encodingHeader);
			const buffer = Buffer.from(file);
			res.end(
				encoding === "gzip"
					? zlib.gzipSync(buffer)
					: encoding === "br"
						? zlib.brotliCompressSync(buffer)
						: zlib.deflateSync(buffer)
			);
			return;
		}
		res.end(file);
	});
	server.unref();
	return server;
}

// Ports of the cases this server answers for: `http-url`, `http-url-global-regexp`
// and `http-url-userinfo`, whose lockfiles name them.
const PORTS = [9990, 9991, 9992];

/** @type {import("http").Server[]} */
const servers = [];
let stopped = false;
// how often a port another Jest run holds is tried again
const RETRY_INTERVAL = 100;

/**
 * Serves one port, or takes it over once another Jest run on this machine frees it.
 * @param {number} port the port
 * @returns {Promise<void>} resolves once the port is served, by this run or the other
 */
const serve = (port) =>
	new Promise((resolve, reject) => {
		const server = createServer();
		servers.push(server);
		/**
		 * @param {NodeJS.ErrnoException} error listen error
		 * @returns {void}
		 */
		const onError = (error) => {
			server.removeListener("listening", onListening);
			if (error.code !== "EADDRINUSE") return reject(error);
			// the other run answers alike until it exits, so setup goes on meanwhile
			resolve();
			setTimeout(listen, RETRY_INTERVAL).unref();
		};
		/**
		 * Listens on the port, unless the run has ended.
		 * @returns {void}
		 */
		const listen = () => {
			if (stopped) return;
			server.once("error", onError);
			server.once("listening", onListening);
			server.listen(port);
		};
		/**
		 * Settles setup once this run serves the port.
		 * @returns {void}
		 */
		const onListening = () => {
			server.removeListener("error", onError);
			resolve();
		};
		listen();
	});

/**
 * Starts one server per port in Jest's global setup. Each config suite runs in
 * its own worker, so a server per worker would make them share the port: one
 * then waits for the other to free it, or loses connections the kernel queued
 * on the other's socket when that one closes.
 * @returns {Promise<void>} resolves once every port is served
 */
const start = () => Promise.all(PORTS.map(serve)).then(() => {});

/**
 * Closes the servers again, once every test file has run. Not awaited: the
 * servers are unref'd, and a keep-alive connection would delay the callback.
 * @returns {void}
 */
const stop = () => {
	stopped = true;
	for (const server of servers.splice(0)) {
		if (server.listening) server.close();
	}
};

module.exports = { start, stop };
