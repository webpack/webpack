"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// `.env` is a directory here, so reading it fails with EISDIR rather than
	// the ENOENT that a simply absent file produces
	dotenv: {
		template: [".env"]
	}
};
