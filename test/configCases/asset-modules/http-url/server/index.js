const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/** @import { Compiler } from "../../../../../" */

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

// The other config suite serves this case on the same port from its own
// process: wait for it to close rather than fail, within the compile timeout.
const LISTEN_RETRY_TIMEOUT = 20000;
const LISTEN_RETRY_INTERVAL = 100;

/**
 * @param {import("http").Server} server server to start
 * @param {number} port port to listen on
 * @param {number} deadline time after which a busy port is an error
 * @returns {Promise<void>} resolves once the server listens
 */
const listen = (server, port, deadline) =>
	new Promise((resolve, reject) => {
		/**
		 * @param {NodeJS.ErrnoException} error listen error
		 */
		const onError = (error) => {
			server.removeListener("listening", onListening);
			if (error.code === "EADDRINUSE" && Date.now() < deadline) {
				setTimeout(() => {
					listen(server, port, deadline).then(resolve, reject);
				}, LISTEN_RETRY_INTERVAL);
				return;
			}
			reject(error);
		};
		const onListening = () => {
			server.removeListener("error", onError);
			resolve();
		};
		server.once("error", onError);
		server.once("listening", onListening);
		server.listen(port);
	});

class ServerPlugin {
	/**
	 * @param {number} port
	 */
	constructor(port) {
		this.port = port;
		this.refs = 0;
		/** @type {import("http").Server | undefined} */
		this.server = undefined;
		/** @type {Promise<void> | undefined} */
		this.listening = undefined;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		// `failed` can follow this compiler's `done` when a later `done` tap throws
		let holding = false;
		compiler.hooks.beforeRun.tapPromise("ServerPlugin", () => {
			holding = true;
			this.refs++;
			if (!this.server) {
				this.server = createServer();
				this.listening = listen(
					this.server,
					this.port,
					Date.now() + LISTEN_RETRY_TIMEOUT
				);
			}
			// every compiler of the run fetches only once the server listens
			return /** @type {Promise<void>} */ (this.listening);
		});

		/**
		 * @param {() => void} callback called once the last compiler let go
		 */
		const release = (callback) => {
			if (!holding) return callback();
			holding = false;
			const server = this.server;
			if (server && --this.refs === 0) {
				this.server = undefined;
				this.listening = undefined;
				server.close(() => callback());
			} else {
				callback();
			}
		};
		compiler.hooks.done.tapAsync("ServerPlugin", (_stats, callback) =>
			release(callback)
		);
		// a build that failed reaches no `done`, and would keep the port
		compiler.hooks.failed.tap("ServerPlugin", () => release(() => {}));
	}
}

module.exports = ServerPlugin;
