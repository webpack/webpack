/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["browserslist"],
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				expect(compilation.outputOptions.environment).toMatchInlineSnapshot(`
			Object {
			  "arrowFunction": true,
			  "asyncFunction": true,
			  "bigIntLiteral": true,
			  "const": true,
			  "destructuring": true,
			  "document": false,
			  "dynamicImport": true,
			  "dynamicImportInWorker": false,
			  "forOf": true,
			  "globalThis": true,
			  "module": true,
			  "nodePrefixForCoreModules": true,
			  "optionalChaining": true,
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
