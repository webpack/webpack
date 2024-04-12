const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: `browserslist:${path.join(__dirname, ".browserslistrc")}`,
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
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
			  "module": false,
			  "nodePrefixForCoreModules": false,
			  "optionalChaining": false,
			  "templateLiteral": false,
			}
		`);
				expect(compilation.options.externalsPresets).toMatchInlineSnapshot(`
			Object {
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
