import fs from "fs";
import path from "path";
import url from "../../asset-modules/_images/file.png";

import(/* webpackChunkName: 'file' */ "./file.txt?foo");

it("should emit manifest with expected entries and paths with function publicPath", () => {
	expect(url).toEqual("/dist/file-loader.png");

	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "bar.json"), "utf-8")
	);

	const keys = Object.keys(manifest).sort();
	expect(keys).toEqual(
		[
			"file.js",
			"file.txt?foo",
			"main.js",
			"third.party.js",
			"file.png"
		].sort()
	);

	expect(manifest["main.js"]).toMatch(/\/dist\/bundle1\.js/);
	expect(manifest["file.js"]).toMatch(/\/dist\/file\.[a-f0-9]+\.js/);
	expect(manifest["file.txt?foo"]).toMatch(/\/dist\/file\.[a-f0-9]+\.txt\?foo/);
	expect(manifest["third.party.js"]).toBe("/dist/third.party.js");
	expect(manifest["file.png"]).toBe("/dist/file-loader.png");
});
