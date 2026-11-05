"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	externals: {
		myExternal: "script myGlobal@https://test.cases/path/external.js",
		myNamespacedExternal:
			"script myNamespace.lib@https://test.cases/path/namespaced.js",
		myFormExternal: "script myForm.lib@https://test.cases/path/form.js",
		myLexicalExternal: "script myLexical@https://test.cases/path/lexical.js"
	},
	optimization: {
		minimize: false
	}
};
