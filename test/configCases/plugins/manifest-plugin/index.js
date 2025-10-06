import fs from "fs";
import path from "path";
import url from "../../asset-modules/_images/file.png";

import(/* webpackChunkName: 'file' */ "./file.txt?foo");

it("should emit manifest with expected entries and paths with string publicPath", () => {
	expect(url).toEqual("/app/file-loader.png");

	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "foo.json"), "utf-8")
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

	expect(manifest["main.js"]).toMatch(/\/app\/bundle0\.js/);
	expect(manifest["file.js"]).toMatch(/\/app\/file\.[a-f0-9]+\.js/);
	expect(manifest["file.txt?foo"]).toMatch(/\/app\/file\.[a-f0-9]+\.txt\?foo/);
	expect(manifest["third.party.js"]).toBe("/app/third.party.js");
	expect(manifest["file.png"]).toBe("/app/file-loader.png");
});
