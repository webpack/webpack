"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			backend: {
				server: {
					key: fs.readFileSync(path.join(__dirname, "key.pem")),
					cert: fs.readFileSync(path.join(__dirname, "cert.pem"))
				}
			}
		}
	}
};
