/*
	MIT License https://www.opensource.org/licenses/mit-license.php
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
 * @typedef {object} SharedServer
 * @property {RequestListener[]} listeners the server's own request listeners
 * @property {Map<string, RequestListener>} backends request listener of each backend, by its url prefix
 * @property {RequestListener} dispatch routes a request to a backend or to the server's own listeners
 */

/** @type {WeakMap<Server, SharedServer>} */
const sharedServers = new WeakMap();
/** @type {WeakMap<import("../Compiler"), string>} */
const sharedPrefixes = new WeakMap();
let sharedBackendCount = 0;

/**
 * Serves a backend's urls on a server it shares with its caller, e.g. a development server.
 * @param {Server} server the shared server
 * @param {string} prefix the backend's url prefix
 * @param {RequestListener} requestListener the backend's request listener
 * @returns {() => void} detaches the backend
 */
const attachToSharedServer = (server, prefix, requestListener) => {
	let shared = sharedServers.get(server);
	if (shared === undefined) {
		const listeners = /** @type {RequestListener[]} */ (
			server.listeners("request")
		);
		/** @type {Map<string, RequestListener>} */
		const backends = new Map();
		/** @type {RequestListener} */
		const dispatch = (req, res) => {
			for (const [backendPrefix, listener] of backends) {
				if (req.url && req.url.startsWith(backendPrefix)) {
					return listener(req, res);
				}
			}
			for (const listener of listeners) listener.call(server, req, res);
		};
		server.removeAllListeners("request");
		server.on("request", dispatch);
		shared = { listeners, backends, dispatch };
		sharedServers.set(server, shared);
	}
	const { listeners, backends, dispatch } = shared;
	backends.set(prefix, requestListener);
	return () => {
		backends.delete(prefix);
		if (backends.size > 0 || sharedServers.get(server) !== shared) return;
		server.off("request", dispatch);
		for (const listener of listeners) server.on("request", listener);
		sharedServers.delete(server);
	};
};

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

	// A server instance belongs to the caller, e.g. a development server: it
	// keeps every other url, and the backend neither listens on it nor closes it.
	const sharedServer =
		typeof options.server === "object" &&
		typeof (/** @type {Server} */ (options.server).listen) === "function"
			? /** @type {Server} */ (options.server)
			: undefined;
	// Each compiler's backend on a shared server answers to urls of its own,
	// the same ones again once restarted, so open pages reconnect to it.
	let prefix = "/lazy-compilation-using-";
	if (sharedServer !== undefined) {
		prefix = sharedPrefixes.get(compiler) || "";
		if (!prefix) {
			prefix = `/lazy-compilation-using-${++sharedBackendCount}-`;
			sharedPrefixes.set(compiler, prefix);
		}
	}
	const isHttps =
		options.protocol === "https" ||
		(typeof options.server === "object" &&
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
			res.writeHead(404);
			res.end();
			return;
		}
		const keys = getRequestedKeys(req.url);
		// On a shared server, only the event stream sockets are the backend's.
		sockets.add(req.socket);
		req.socket.on("close", () => {
			sockets.delete(req.socket);
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

	/** @type {Set<import("net").Socket>} */
	const sockets = new Set();

	/**
	 * Hands the backend api to the plugin.
	 * @param {Server} server the server the backend is served on
	 * @param {string} urlBase the url clients reach the backend at
	 * @param {(() => void)=} detach detaches the backend from a shared server
	 * @returns {void}
	 */
	const started = (server, urlBase, detach) => {
		logger.log(
			`Server-Sent-Events server for lazy compilation open at ${urlBase}.`
		);
		callback(null, {
			dispose(callback) {
				isClosing = true;
				for (const timer of idleTimers) clearTimeout(timer);
				idleTimers.clear();
				if (detach !== undefined) {
					// The server is the caller's to close.
					detach();
					for (const socket of sockets) socket.destroy();
					return callback(null);
				}
				// Removing the listener is a workaround for a memory leak in node.js
				server.off("request", requestListener);
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
		// The caller may listen only after the first build, which waits for this
		// backend, so it names the url.
		if (!options.urlBase) {
			return callback(
				new Error(
					"A lazy compilation backend on a shared server needs a `urlBase`"
				)
			);
		}
		const detach = attachToSharedServer(sharedServer, prefix, requestListener);
		const urlBase = options.urlBase.endsWith("/")
			? options.urlBase.slice(0, -1)
			: options.urlBase;
		return started(sharedServer, urlBase, detach);
	}

	const server = createServer();
	server.on("request", requestListener);
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

	server.on(
		"listening",
		/**
		 * Handles the callback logic for this hook.
		 * @param {Error} err error
		 * @returns {void}
		 */
		(err) => {
			if (err) return callback(err);
			const _addr = server.address();
			if (typeof _addr === "string") {
				throw new Error("addr must not be a string");
			}
			const addr = /** @type {AddressInfo} */ (_addr);
			const urlBase =
				addr.address === "::" || addr.address === "0.0.0.0"
					? `${protocol}://localhost:${addr.port}`
					: addr.family === "IPv6"
						? `${protocol}://[${addr.address}]:${addr.port}`
						: `${protocol}://${addr.address}:${addr.port}`;
			started(server, urlBase);
		}
	);
	listen(server);
};
