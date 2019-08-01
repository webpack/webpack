module.exports = {
	plugins: [
		compiler => {
			const files = {};
			compiler.hooks.assetEmitted.tap("Test", (file, buffer) => {
				files[file] = Buffer.isBuffer(buffer);
			});
			compiler.hooks.afterEmit.tap("Test", () => {
				expect(files).toMatchInlineSnapshot(`
Object {
  "1.bundle0.js": true,
  "bundle0.js": true,
}
`);
			});
		}
	]
};
