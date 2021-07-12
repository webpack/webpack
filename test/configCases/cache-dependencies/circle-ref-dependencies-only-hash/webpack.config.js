const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	snapshot: {
		managedPaths: [path.resolve(__dirname, "node_modules")],
		buildDependencies: {
			hash: true,
			timestamp: false
		}
	},

	cache: {
		type: "filesystem",
		buildDependencies: {
			config: [
				path.resolve(__dirname, "node_modules/m2"),
				path.resolve(__dirname, "node_modules/m1")
			]
		}
	},
	plugins: [
		compiler => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				const fileDeps = Array.from(compilation.fileDependencies);
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/m2/package.json")
				);
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/m2/index.js")
				);
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/m1/package.json")
				);
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/m1/index.js")
				);
				expect(fileDeps).toContain(path.resolve(__dirname, "index.js"));
			});
		}
	]
};
