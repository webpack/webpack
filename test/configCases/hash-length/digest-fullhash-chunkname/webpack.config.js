"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	// [fullhash:<digest>] cannot be re-encoded in the runtime chunk-filename
	// expression for dynamically-loaded chunks, so the build must error clearly.
	output: {
		chunkFilename: "[name].[fullhash:base64url:8].js"
	}
};
