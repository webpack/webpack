const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	snapshot: {
		managedPaths: [path.resolve(__dirname, "node_modules")],
		buildDependencies: {
			hash: false,
			timestamp: true
		}
	},
	cache: {
		type: "filesystem",
		buildDependencies: {
			m1: [path.resolve(__dirname, "node_modules/m1")],
			m2: [path.resolve(__dirname, "node_modules/m2")]
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
