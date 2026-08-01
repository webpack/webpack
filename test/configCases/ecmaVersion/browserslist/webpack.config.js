"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["browserslist"],
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
			  "generator": true,
			  "globalThis": true,
			  "hasOwn": true,
			  "importMetaDirnameAndFilename": true,
			  "let": true,
			  "logicalAssignment": true,
			  "methodShorthand": true,
			  "module": true,
			  "modulePreload": false,
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
			  "bun": false,
			  "deno": false,
			  "electron": false,
			  "electronMain": false,
			  "electronPreload": false,
			  "electronRenderer": false,
			  "node": true,
			  "nodeModules": false,
			  "nwjs": false,
			  "web": false,
			}
		`);
			});
		}
	]
};
