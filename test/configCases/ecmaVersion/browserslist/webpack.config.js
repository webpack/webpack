/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["browserslist"],
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				expect(compilation.outputOptions.environment).toMatchInlineSnapshot(`
			Object {
			  "arrowFunction": true,
			  "bigIntLiteral": true,
			  "const": true,
			  "destructuring": true,
			  "dynamicImport": false,
			  "forOf": true,
			  "module": false,
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
