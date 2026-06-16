"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "browserslist:maintained node versions",
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				expect(compilation.outputOptions.environment).toMatchInlineSnapshot(`
			Object {
			  "arrowFunction": true,
			  "asyncFunction": true,
			  "bigIntLiteral": true,
			  "const": true,
			  "destructuring": true,
			  "document": false,
			  "dynamicImport": true,
			  "dynamicImportInWorker": true,
			  "forOf": true,
			  "globalThis": true,
			  "hasOwn": true,
			  "importMetaDirnameAndFilename": true,
			  "let": true,
			  "methodShorthand": true,
			  "module": true,
			  "nodeBuiltinModuleGetter": true,
			  "nodePrefixForCoreModules": true,
			  "optionalChaining": true,
			  "spread": true,
			  "symbol": true,
			  "templateLiteral": true,
			}
		`);
				expect(compilation.options.externalsPresets).toMatchInlineSnapshot(`
			Object {
			  "electron": false,
			  "electronMain": false,
			  "electronPreload": false,
			  "electronRenderer": false,
			  "node": true,
			  "nwjs": false,
			  "web": false,
			}
		`);
			});
		}
	]
};
