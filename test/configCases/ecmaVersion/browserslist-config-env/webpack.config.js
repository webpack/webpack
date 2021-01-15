const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: `browserslist:${path.join(__dirname, ".browserslistrc")}:modern`,
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				expect(compilation.outputOptions.environment).toMatchInlineSnapshot(`
			Object {
			  "arrowFunction": false,
			  "bigIntLiteral": false,
			  "const": false,
			  "destructuring": false,
			  "dynamicImport": false,
			  "forOf": false,
			  "module": false,
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
