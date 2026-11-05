"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	externals: {
		myExternal: "script myGlobal@https://test.cases/path/external.js"
	},
	optimization: {
		minimize: false
	}
};
