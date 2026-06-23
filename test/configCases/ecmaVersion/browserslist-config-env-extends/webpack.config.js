"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: `browserslist:${path.join(__dirname, ".browserslistrc")}:production`,
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				expect(compilation.outputOptions.environment).toMatchInlineSnapshot(`
			Object {
			  "arrowFunction": false,
			  "asyncFunction": false,
			  "bigIntLiteral": false,
			  "const": false,
			  "destructuring": false,
			  "document": true,
			  "dynamicImport": false,
			  "dynamicImportInWorker": false,
			  "forOf": false,
			  "globalThis": false,
			  "hasOwn": false,
			  "importMetaDirnameAndFilename": false,
			  "let": false,
			  "logicalAssignment": false,
			  "methodShorthand": false,
			  "module": false,
			  "nodeBuiltinModuleGetter": false,
			  "nodePrefixForCoreModules": false,
			  "optionalChaining": false,
			  "spread": false,
			  "symbol": false,
			  "templateLiteral": false,
			}
		`);
				expect(compilation.options.externalsPresets).toMatchInlineSnapshot(`
			Object {
			  "bun": false,
			  "deno": false,
			  "electron": false,
			  "electronMain": false,
			  "electronPreload": false,
			  "electronRenderer": false,
			  "node": false,
			  "nwjs": false,
			  "web": true,
			}
		`);
			});
		}
	]
};
