"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: [
		// @ts-expect-error the deprecated (context, request, callback) form is not in the types
		(context, request, callback) => {
			if (request === "external") return callback(null, "var 42");
			callback();
		}
	]
};
