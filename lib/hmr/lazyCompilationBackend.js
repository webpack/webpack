/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const http = require("http");

/** @typedef {import("../Compiler")} Compiler */

/**
 * @param {Compiler} compiler compiler
 * @param {string} client client reference
 * @param {function(Error?, any?): void} callback callback
 * @returns {void}
 */
module.exports = (compiler, client, callback) => {
	const logger = compiler.getInfrastructureLogger("LazyCompilationBackend");
	const activeModules = new Map();
	const prefix = "/lazy-compilation-using-";

	const server = http.createServer((req, res) => {
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
	});
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
	server.listen(err => {
		if (err) return callback(err);
		const addr = server.address();
		if (typeof addr === "string") throw new Error("addr must not be a string");
		const urlBase =
			addr.address === "::" || addr.address === "0.0.0.0"
				? `http://localhost:${addr.port}`
				: addr.family === "IPv6"
				? `http://[${addr.address}]:${addr.port}`
				: `http://${addr.address}:${addr.port}`;
		logger.log(
			`Server-Sent-Events server for lazy compilation open at ${urlBase}.`
		);
		callback(null, {
			dispose(callback) {
				isClosing = true;
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
