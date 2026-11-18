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
 * @typedef {object} SharedServerState
 * @property {RequestListener[]} listeners the server's own request listeners, put back once no backend is left
 * @property {Map<string, RequestListener>} backends request listener of each backend on the server, by its url prefix
 * @property {RequestListener} dispatch the one request listener that routes between the backends and the server's own
 */

/** @type {WeakMap<Server, SharedServerState>} */
const sharedServers = new WeakMap();
let sharedBackendCount = 0;

/**
 * Routes a backend's own urls to it on a server shared with its caller and other backends.
 * @param {Server} server the shared server
 * @param {string} prefix the backend's url prefix
 * @param {RequestListener} requestListener the backend's request listener
 * @returns {() => void} detaches the backend again
 */
const attachToSharedServer = (server, prefix, requestListener) => {
	let state = sharedServers.get(server);
	if (state === undefined) {
		// Raw listeners keep a `once` registration one-shot when put back.
		const listeners = /** @type {RequestListener[]} */ (
			server.rawListeners("request")
		);
		/** @type {Map<string, RequestListener>} */
		const backends = new Map();
		/** @type {RequestListener} */
		const dispatch = (req, res) => {
			if (req.url !== undefined) {
				for (const [backendPrefix, listener] of backends) {
					if (req.url.startsWith(backendPrefix)) return listener(req, res);
				}
			}
			const toCall = [...listeners];
			// A `once` wrapper (it carries `.listener`) leaves the saved list before
			// it runs, so a detach from inside it can't put it back.
			for (let i = listeners.length - 1; i >= 0; i--) {
				if (
					typeof (
						/** @type {{ listener?: unknown }} */ (listeners[i]).listener
					) === "function"
				) {
					listeners.splice(i, 1);
				}
			}
			for (const listener of toCall) listener.call(server, req, res);
		};
		server.removeAllListeners("request");
		server.on("request", dispatch);
		state = { listeners, backends, dispatch };
		sharedServers.set(server, state);
	}
	const attached = state;
	attached.backends.set(prefix, requestListener);
	return () => {
		if (!attached.backends.delete(prefix) || attached.backends.size > 0) {
			return;
		}
		server.off("request", attached.dispatch);
		for (const listener of attached.listeners) server.on("request", listener);
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
	// Each backend on a shared server, e.g. one per compiler of a development
	// server, answers to urls of its own.
	const prefix =
		sharedServer !== undefined
			? `/lazy-compilation-using-${++sharedBackendCount}-`
			: "/lazy-compilation-using-";
	const isHttps =
		options.protocol === "https" ||
		(sharedServer !== undefined
			? // `https` and secure `http2` servers are TLS servers on every Node.js.
				sharedServer instanceof require("tls").Server
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
			res.writeHead(404);
			res.end();
			return;
		}
		const keys = getRequestedKeys(req.url);
		if (sharedServer !== undefined) sockets.add(req.socket);
		req.socket.on("close", () => {
			if (sharedServer !== undefined) sockets.delete(req.socket);
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
	const detach =
		sharedServer !== undefined
			? attachToSharedServer(sharedServer, prefix, requestListener)
			: undefined;
	if (detach === undefined) server.on("request", requestListener);

	/** @type {Set<import("net").Socket>} */
	const sockets = new Set();
	if (detach === undefined) {
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
		/** @type {string} */
		let urlBase;
		try {
			urlBase = options.urlBase
				? options.urlBase.replace(/\/+$/, "")
				: getUrlBase();
		} catch (err_) {
			if (detach !== undefined) detach();
			else server.close();
			return callback(/** @type {Error} */ (err_));
		}
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
				if (detach !== undefined) {
					detach();
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
		if (options.urlBase || sharedServer.listening) {
			onListening();
		} else {
			/**
			 * @param {Error} err why the server could not listen
			 * @returns {void}
			 */
			const onError = (err) => {
				sharedServer.off("listening", onShared);
				/** @type {() => void} */ (detach)();
				callback(err);
			};
			const onShared = () => {
				sharedServer.off("error", onError);
				onListening();
			};
			sharedServer.once("listening", onShared);
			sharedServer.once("error", onError);
		}
	} else {
		server.on("listening", onListening);
		listen(server);
	}
};
