/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("http").ServerOptions} HttpServerOptions */
/** @typedef {import("https").ServerOptions} HttpsServerOptions */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} BackendConfiguration
 * @property {HttpServerOptions} httpServerOptions Options to be passed to the Node.js HTTP module.
 * @property {HttpsServerOptions} httpsServerOptions Options to be passed to the Node.js HTTPS module.
 * @property {number?} port Custom port for lazy compilation backend. If not defined, a random port will be used.
 */

/**
 * @param {Compiler} compiler compiler
 * @param {string} client client reference
 * @param {function(Error?, any?): void} callback callback
 * @param {?BackendConfiguration} backendConfiguration additional options for the backend
 * @returns {void}
 */
module.exports = (compiler, client, callback, backendConfiguration) => {
	const logger = compiler.getInfrastructureLogger("LazyCompilationBackend");
	const activeModules = new Map();
	const prefix = "/lazy-compilation-using-";

	const isHTTPS =
		!!backendConfiguration && !!backendConfiguration.httpsServerOptions;

	const protocol = isHTTPS ? "https" : "http";
	const httpModule = isHTTPS ? require("https") : require("http");

	const requestListener = (req, res) => {
		const keys = req.url.slice(prefix.length).split("@");
		req.socket.on("close", () => {
			setTimeout(() => {
				for (const key of keys) {
					const oldValue = activeModules.get(key) || 0;
					activeModules.set(key, oldValue - 1);
					if (oldValue === 1) {
						logger.log(
							`${key} is no longer in use. Next compilation will skip this module.`
						);
					}
				}
			}, 120000);
		});
		req.socket.setNoDelay(true);
		res.writeHead(200, {
			"content-type": "text/event-stream",
			"Access-Control-Allow-Origin": "*"
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

	const server = httpModule.createServer(
		backendConfiguration &&
			(backendConfiguration.httpServerOptions ||
				backendConfiguration.httpsServerOptions),
		requestListener
	);

	let isClosing = false;
	/** @type {Set<import("net").Socket>} */
	const sockets = new Set();
	server.on("connection", socket => {
		sockets.add(socket);
		socket.on("close", () => {
			sockets.delete(socket);
		});
		if (isClosing) socket.destroy();
	});
	server.listen(backendConfiguration && backendConfiguration.port, err => {
		if (err) return callback(err);
		const addr = server.address();
		if (typeof addr === "string") throw new Error("addr must not be a string");
		const urlBase =
			addr.address === "::" || addr.address === "0.0.0.0"
				? `${protocol}://localhost:${addr.port}`
				: addr.family === "IPv6"
				? `${protocol}://[${addr.address}]:${addr.port}`
				: `${protocol}://${addr.address}:${addr.port}`;
		logger.log(
			`Server-Sent-Events server for lazy compilation open at ${urlBase}.`
		);
		callback(null, {
			dispose(callback) {
				isClosing = true;
				// Removing the listener is a workaround for a memory leak in node.js
				server.off("request", requestListener);
				server.close(err => {
					callback(err);
				});
				for (const socket of sockets) {
					socket.destroy(new Error("Server is disposing"));
				}
			},
			module(originalModule) {
				const key = `${encodeURIComponent(
					originalModule.identifier().replace(/\\/g, "/").replace(/@/g, "_")
				).replace(/%(2F|3A|24|26|2B|2C|3B|3D|3A)/g, decodeURIComponent)}`;
				const active = activeModules.get(key) > 0;
				return {
					client: `${client}?${encodeURIComponent(urlBase + prefix)}`,
					data: key,
					active
				};
			}
		});
	});
};
