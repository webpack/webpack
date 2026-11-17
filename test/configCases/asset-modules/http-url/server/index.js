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

class ServerPlugin {
	/**
	 * @param {number} port
	 */
	constructor(port) {
		this.port = port;
		this.refs = 0;
		this.server = undefined;
		/** @type {Promise<void> | undefined} */
		this.listening = undefined;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.beforeRun.tapPromise("ServerPlugin", async () => {
			this.refs++;
			if (!this.listening) {
				const server = createServer();
				this.server = server;
				// The lockfiles name this port, so every suite that runs this case
				// uses it. Suites run in parallel workers: while another one's server
				// holds the port, wait for it to close rather than fail.
				const deadline = Date.now() + 20000;
				this.listening = new Promise(
					/**
					 * @param {(value: void) => void} resolve resolve
					 * @param {(reason?: Error) => void} reject reject
					 */
					(resolve, reject) => {
						/**
						 * @param {NodeJS.ErrnoException} err the listen error
						 */
						const onError = (err) => {
							if (err.code === "EADDRINUSE" && Date.now() < deadline) {
								setTimeout(() => server.listen(this.port), 100);
								return;
							}
							server.off("error", onError);
							this.server = undefined;
							this.listening = undefined;
							reject(err);
						};
						server.on("error", onError);
						server.listen(this.port, () => {
							server.off("error", onError);
							resolve();
						});
					}
				);
			}
			// Every compiler sharing the plugin waits until the server listens.
			try {
				await this.listening;
			} catch (err) {
				// A failed beforeRun skips done, so release this run's reference here.
				this.refs--;
				throw err;
			}
		});

		compiler.hooks.done.tapAsync("ServerPlugin", (stats, callback) => {
			const s = this.server;
			if (s && --this.refs === 0) {
				this.server = undefined;
				this.listening = undefined;
				s.close(callback);
			} else {
				callback();
			}
		});
	}
}

module.exports = ServerPlugin;
