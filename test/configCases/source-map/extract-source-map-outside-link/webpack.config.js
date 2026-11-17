"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_NAME = "BuildPackagePlugin";

const ENTRY = `"use strict";

const fs = require("fs");

it("does not read a source linked to a file outside the module's package", () => {
	expect(require("./pkg/dist/dep.js").value).toBe(1);
	const { sources, sourcesContent } = JSON.parse(
		fs.readFileSync(__filename + ".map", "utf-8")
	);
	const index = sources.findIndex((source) => source.endsWith("linked.ts"));
	expect(index).toBeGreaterThan(-1);
	expect(JSON.stringify(sourcesContent)).not.toContain("linked-" + "outside");
});
`;

/**
 * Builds a package whose map lists `src/linked.ts`, a link to a file outside
 * the package. Links need rights on Windows, so it is built next to the output.
 * @param {string} source where the tree is built
 * @returns {void}
 */
const buildTree = (source) => {
	const pkg = path.join(source, "pkg");
	const link = path.join(pkg, "src/linked.ts");
	fs.mkdirSync(path.join(pkg, "dist"), { recursive: true });
	fs.mkdirSync(path.join(pkg, "src"), { recursive: true });
	fs.writeFileSync(path.join(source, "index.js"), ENTRY);
	fs.writeFileSync(path.join(source, "secret.txt"), "linked-outside");
	fs.writeFileSync(path.join(pkg, "package.json"), '{ "name": "pkg" }');
	fs.writeFileSync(
		path.join(pkg, "dist/dep.js"),
		"module.exports.value = 1;\n//# sourceMappingURL=dep.js.map\n"
	);
	fs.writeFileSync(
		path.join(pkg, "dist/dep.js.map"),
		JSON.stringify({
			version: 3,
			file: "dep.js",
			sources: ["../src/linked.ts"],
			sourcesContent: [null],
			names: [],
			mappings: "AAAA"
		})
	);
	if (fs.existsSync(link)) fs.unlinkSync(link);
	fs.symlinkSync(path.join(source, "secret.txt"), link, "file");
};

/** @type {(env: unknown, argv: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const source = `${testPath}-source`;
	return {
		context: source,
		entry: "./index.js",
		target: "node",
		devtool: "source-map",
		module: {
			rules: [{ test: /dep\.js$/, extractSourceMap: true }]
		},
		plugins: [
			(compiler) => {
				compiler.hooks.environment.tap(PLUGIN_NAME, () => buildTree(source));
			}
		]
	};
};
