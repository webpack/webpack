const Compilation = require("../../../../").Compilation;
const Source = require("webpack-sources").Source;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		css: true
	},
	optimization: {
		minimize: true
	},
	plugins: [
		compiler => {
			const files = {};
			compiler.hooks.assetEmitted.tap(
				"Test",
				(file, { content, source, outputPath, compilation, targetPath }) => {
					expect(Buffer.isBuffer(content)).toBe(true);
					expect(source).toBeInstanceOf(Source);
					expect(typeof outputPath).toBe("string");
					expect(typeof targetPath).toBe("string");
					expect(compilation).toBeInstanceOf(Compilation);
					files[file] = content.toString("utf-8");
				}
			);
			compiler.hooks.afterEmit.tap("Test", () => {
				// css should be minimized
				expect(files["bundle0.css"]).toMatchInlineSnapshot(
					`"body{background:red}head{--webpack-179:_258}"`
				);
			});
		}
	]
};
