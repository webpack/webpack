/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("http").ServerOptions} HttpServerOptions */
/** @typedef {import("https").ServerOptions} HttpsServerOptions */
/** @import { RequestListener, Server as HttpServer } from "http" */
/** @import { Server as HttpsServer } from "https" */
/** @import { AddressInfo } from "net" */
/** @import { BackendHandler, LazyCompilationBackendOptions } from "./LazyCompilationPlugin" */

/** @typedef {HttpServer | HttpsServer} Server */
/** @typedef {(server: Server) => void} Listen */
/** @typedef {() => Server} CreateServerFunction */

/**
 * Returns backend.
 * @param {LazyCompilationBackendOptions} options additional options for the backend
 * @returns {BackendHandler} backend
 */
module.exports = (options) => (compiler, callback) => {
	const logger = compiler.getInfrastructureLogger("LazyCompilationBackend");
	/** @type {Map<string, number>} */
	const activeModules = new Map();
	/** @type {Set<string>} */
	const knownKeys = new Set();
	/** @type {Set<NodeJS.Timeout>} */
	const idleTimers = new Set();
	let isClosing = false;
	const prefix = "/lazy-compilation-using-";

	// A server instance belongs to the caller, e.g. a development server: it
	// keeps every other url, and the backend neither listens on it nor closes it.
	const sharedServer =
		typeof options.server === "object" &&
		typeof (/** @type {Server} */ (options.server).listen) === "function"
			? /** @type {Server} */ (options.server)
			: undefined;
	const isHttps =
		options.protocol === "https" ||
		(sharedServer !== undefined
			? typeof (/** @type {HttpsServer} */ (sharedServer).setSecureContext) ===
				"function"
			: typeof options.server === "object" &&
				("key" in options.server || "pfx" in options.server));

	/** @type {CreateServerFunction} */
	const createServer =
		typeof options.server === "function"
			? options.server
			: (() => {
					const http = isHttps ? require("https") : require("http");
					return /** @type {(this: import("http") | import("https"), options: HttpServerOptions | HttpsServerOptions) => Server} */ (
						http.createServer
					).bind(
						http,
						/** @type {HttpServerOptions | HttpsServerOptions} */
						(options.server)
					);
				})();
	/** @type {Listen} */
	const listen =
		typeof options.listen === "function"
			? options.listen
			: (server) => {
					// The server has no authentication, so it stays off other hosts
					// unless a host is named.
					const listen =
						typeof options.listen === "number"
							? { port: options.listen }
							: /** @type {import("net").ListenOptions | undefined} */ (
									options.listen
								);
					server.listen({
						port: undefined,
						...listen,
						host: (listen && listen.host) || "localhost"
					});
				};

	const protocol = options.protocol || (isHttps ? "https" : "http");

	/**
	 * The server is reachable by anyone who can open a connection, so only keys
	 * handed out by `module()` count. Picking them from `knownKeys` returns each
	 * key once and as the string created there, not as a slice of the request
	 * url, which would keep the whole url alive for as long as the key is held.
	 * @param {string} url request url, starting with the prefix
	 * @returns {string[]} keys of lazily compiled modules named by the request
	 */
	const getRequestedKeys = (url) => {
		const requested = new Set(url.slice(prefix.length).split("@"));
		return [...knownKeys].filter((key) => requested.has(key));
	};

	/** @type {RequestListener} */
	const requestListener = (req, res) => {
		if (req.url === undefined) return;
		if (!req.url.startsWith(prefix)) {
			if (sharedListeners !== undefined) {
				for (const listener of sharedListeners) listener.call(server, req, res);
				return;
			}
			res.writeHead(404);
			res.end();
			return;
		}
		const keys = getRequestedKeys(req.url);
		if (sharedListeners !== undefined) sockets.add(req.socket);
		req.socket.on("close", () => {
			if (sharedListeners !== undefined) sockets.delete(req.socket);
			// Shutting down, or nothing was counted: skip the idle-decrement timer.
			if (isClosing || keys.length === 0) return;
			const timer = setTimeout(() => {
				idleTimers.delete(timer);
				for (const key of keys) {
					const oldValue = activeModules.get(key) || 0;
					// Drop the entry at zero so the map doesn't retain idle modules
					// and the count can't drift negative.
					if (oldValue <= 1) {
						activeModules.delete(key);
						if (oldValue === 1) {
							logger.log(
								`${key} is no longer in use. Next compilation will skip this module.`
							);
						}
					} else {
						activeModules.set(key, oldValue - 1);
					}
				}
			}, 120000);
			// Don't keep the process alive just to decrement idle counters.
			if (timer.unref) timer.unref();
			idleTimers.add(timer);
		});
		// Not all runtimes expose `setNoDelay` on the request socket (e.g. Deno's
		// HTTP server); it's only a latency optimization, so skip it when absent.
		if (req.socket.setNoDelay) req.socket.setNoDelay(true);
		res.writeHead(200, {
			"content-type": "text/event-stream",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "*",
			"Access-Control-Allow-Headers": "*"
		});
		res.write("\n");
		let moduleActivated = false;
		for (const key of keys) {
			const oldValue = activeModules.get(key) || 0;
			activeModules.set(key, oldValue + 1);
			if (oldValue === 0) {
				logger.log(`${key} is now in use and will be compiled.`);
				moduleActivated = true;
			}
		}
		if (moduleActivated && compiler.watching) compiler.watching.invalidate();
	};

	const server = sharedServer || createServer();
	const sharedListeners = sharedServer
		? /** @type {RequestListener[]} */ (sharedServer.listeners("request"))
		: undefined;
	if (sharedListeners !== undefined) server.removeAllListeners("request");
	server.on("request", requestListener);

	/** @type {Set<import("net").Socket>} */
	const sockets = new Set();
	if (sharedListeners === undefined) {
		server.on(
			"connection",
			/**
			 * @param {import("net").Socket} socket accepted connection
			 */
			(socket) => {
				sockets.add(socket);
				socket.on("close", () => {
					sockets.delete(socket);
				});
				if (isClosing) socket.destroy();
			}
		);
		server.on(
			"clientError",
			/**
			 * @param {Error} e error of a client connection
			 */
			(e) => {
				// A closing browser tab or a test tearing down aborts the request and
				// resets the socket; that surfaces here as ECONNRESET and is benign.
				if (
					e.message === "Server is disposing" ||
					/** @type {NodeJS.ErrnoException} */ (e).code === "ECONNRESET"
				) {
					return;
				}
				logger.warn(e);
			}
		);
	}

	/**
	 * The url clients reach the backend at, read from the server's address.
	 * @returns {string} the url, without a trailing slash
	 */
	const getUrlBase = () => {
		const _addr = server.address();
		if (typeof _addr === "string") {
			throw new Error("addr must not be a string");
		}
		const addr = /** @type {AddressInfo} */ (_addr);
		return addr.address === "::" || addr.address === "0.0.0.0"
			? `${protocol}://localhost:${addr.port}`
			: addr.family === "IPv6"
				? `${protocol}://[${addr.address}]:${addr.port}`
				: `${protocol}://${addr.address}:${addr.port}`;
	};

	/**
	 * Hands the backend api to the plugin once the server is listening.
	 * @param {Error=} err error
	 * @returns {void}
	 */
	const onListening = (err) => {
		if (err) return callback(err);
		const urlBase = options.urlBase || getUrlBase();
		logger.log(
			`Server-Sent-Events server for lazy compilation open at ${urlBase}.`
		);
		callback(null, {
			dispose(callback) {
				isClosing = true;
				for (const timer of idleTimers) clearTimeout(timer);
				idleTimers.clear();
				// Removing the listener is a workaround for a memory leak in node.js
				server.off("request", requestListener);
				if (sharedListeners !== undefined) {
					for (const listener of sharedListeners) {
						server.on("request", listener);
					}
					for (const socket of sockets) socket.destroy();
					return callback(null);
				}
				for (const socket of sockets) {
					socket.destroy(new Error("Server is disposing"));
				}
				// Some runtimes (e.g. Deno) don't emit "connection", so `sockets`
				// misses the open SSE connections and `server.close` would hang;
				// force-close everything before waiting for it.
				if (server.closeAllConnections) server.closeAllConnections();
				server.close((err) => {
					// `closeAllConnections()` already stops the server on some runtimes
					// (e.g. Bun), so `close` then reports ERR_SERVER_NOT_RUNNING; the
					// server is closed either way, so that's not a dispose failure.
					callback(
						err &&
							/** @type {NodeJS.ErrnoException} */ (err).code !==
								"ERR_SERVER_NOT_RUNNING"
							? err
							: null
					);
				});
			},
			module(originalModule) {
				const key = `${encodeURIComponent(
					originalModule.identifier().replace(/\\/g, "/").replace(/@/g, "_")
				).replace(/%(2F|3A|24|26|2B|2C|3B|3D)/g, decodeURIComponent)}`;
				knownKeys.add(key);
				const active = /** @type {number} */ (activeModules.get(key)) > 0;
				return {
					client: `${options.client}?${encodeURIComponent(urlBase + prefix)}`,
					data: key,
					active
				};
			}
		});
	};

	if (sharedServer !== undefined) {
		// A development server may listen only after the first build, which
		// waits for this backend, so a given `urlBase` starts it at once.
		if (options.urlBase || sharedServer.listening) onListening();
		else sharedServer.once("listening", () => onListening());
	} else {
		server.on("listening", onListening);
		listen(server);
	}
};
