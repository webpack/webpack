"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			backend: {
				// Custom client passes `rejectUnauthorized: false` per request so the
				// self-signed cert is accepted; lets the case run under Bun, which
				// ignores a runtime `NODE_TLS_REJECT_UNAUTHORIZED`.
				client: require.resolve("./client.js"),
				server: {
					key: fs.readFileSync(path.join(__dirname, "key.pem")),
					cert: fs.readFileSync(path.join(__dirname, "cert.pem"))
				}
			}
		}
	}
};
