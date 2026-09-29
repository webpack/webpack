"use strict";

const { ContainerReferencePlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: {
				// An `internal ` fallback before a real external must not shift the
				// fallback index, or the real external references an unregistered
				// container request and the build fails.
				abc: ["internal ./fallback-abc", "ABC"]
			}
		})
	]
};
