import "./style.css";
import "./dependency.js";
import url from "../../asset-modules/_images/file.png";

import(/* webpackChunkName: 'file' */ "./file.txt?foo");

new URL("./file.txt", import.meta.url);
new URL("./public/other.txt", import.meta.url);

function importEntrypoints(manifest, name) {
	const seen = new Set();

	function getImportedChunks(entrypoint) {
		const scripts = [];
		const styles = [];

		for (const item of entrypoint.imports) {
			const importee = manifest.assets[item];

			if (seen.has(item)) {
				continue;
			}

			seen.add(item);

			for (const parent of entrypoint.parents || []) {
				const [parentStyles, parentScripts] = getImportedChunks(manifest.entrypoints[parent])
				styles.push(...parentStyles);
				scripts.push(...parentScripts);
			}

			if (/\.css$/.test(importee.file)) {
				styles.push(importee.file);
			} else {
				scripts.push(importee.file);
			}
		}

		return [styles, scripts];
	}

	return getImportedChunks(manifest.entrypoints[name]);
}

it("should emit manifest with expected entries and paths with function publicPath", async () => {
	// await import(/* webpackName: "my-name" */ "./nested/module.js?foo=bar#hash");

	const manifest = __non_webpack_require__("./other.json");
	const { custom, entrypoints, assets } = manifest;

	expect(custom).toBe("value");
	expect(entrypoints).toEqual({
		"nested-shared": {
			"imports": [
				"runtime~nested-shared.js",
				"nested-shared.js"
			]
		},
		"shared": {
			"imports": [
				"shared.js",
				"shared.css"
			],
			"parents": [
				"nested-shared"
			]
		},
		"foo": {
			"imports": [
				"commons-dependency_js.js",
				"foo.js",
				"foo.css"
			],
			"parents": [
				"shared"
			]
		}
	});
	expect(importEntrypoints(manifest, "foo")).toEqual([
			["/nested/shared.css", "/nested/foo.css"],
			[
				"/nested/runtime~nested-shared.js",
				"/nested/nested-shared.js",
				"/nested/shared.js",
				"/nested/commons-dependency_js.js",
				"/nested/foo.js"
			],
	]);
	expect(Object.keys(assets).sort()).toEqual(
		[
			"commons-dependency_js.js",
			"commons-dependency_js.js.map",
			"file.txt",
			"foo.js",
			"foo.js.map",
			"file.js",
			"file.txt?foo",
			"nested-shared.js",
			"nested-shared.js.map",
			"runtime~nested-shared.js",
			"runtime~nested-shared.js.map",
			"shared.css",
			"shared.css.map",
			"foo.css",
			"foo.css.map",
			"shared.js",
			"shared.js.map",
			"public/other.txt",
			"third.party.js"
		].sort()
	);
	expect(assets["foo.js"].file).toBe("/nested/foo.js");
	expect(assets["file.txt?foo"].file).toMatch(/\/nested\/file\.[a-f0-9]+\.txt\?foo/);
	expect(assets["file.txt?foo"].src).toBeDefined();
});
