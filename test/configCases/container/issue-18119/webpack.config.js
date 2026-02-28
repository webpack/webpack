"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "app",
			remotes: {
				remote: `promise new Promise((resolve) => {
					if (typeof __webpack_require__.l !== "function") {
						throw new Error("Expected __webpack_require__.l to be defined");
					}
					resolve({
						get: (request) => Promise.resolve(() => request),
						init: () => {}
					});
				})`
			}
		})
	]
};
