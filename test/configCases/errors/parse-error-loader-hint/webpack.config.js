"use strict";

const identityLoader = require.resolve("./identity-loader.js");
const addCommentLoader = require.resolve("./add-comment-loader.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{ test: /single\.tpl$/, use: [{ loader: identityLoader }] },
			{
				test: /array\.tpl$/,
				use: [{ loader: identityLoader }, { loader: addCommentLoader }]
			},
			// two matching rules, each naming its loader as a plain string
			{ test: /string\.tpl$/, use: identityLoader },
			{ test: /string\.tpl$/, use: addCommentLoader }
		]
	},
	// the bundle has to be emitted for the failing module to be executed
	optimization: {
		emitOnErrors: true
	}
};
