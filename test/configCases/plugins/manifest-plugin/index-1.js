import fs from "fs";
import path from "path";
import url from "../../asset-modules/_images/file.png";

it("should emit manifest with expected entries and paths with string publicPath", async () => {
	await import(/* webpackChunkName: 'file' */ "./file.txt?foo");
	await import("./module.js");

	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "foo.json"), "utf-8")
	);
	const { entrypoints, assets } = manifest;

	expect(entrypoints).toStrictEqual({ main: { imports: ["main.js"] } });
	expect(Object.keys(assets).sort()).toEqual(
		[
			"main.js",
			"module_js.js",
			"file.js",
			"file.txt?foo",
			"third.party.js",
			"../../asset-modules/_images/file.png"
		].sort()
	);
	expect(assets["main.js"].file).toBe("/app/bundle0.js");
	expect(assets["module_js.js"].file).toMatch(/\/app\/module_js\.[a-f0-9]+\.js/);
	expect(assets["third.party.js"].file).toBe("/app/third.party.js");
	expect(assets["../../asset-modules/_images/file.png"].file).toBe("/app/file-loader.png");
	expect(assets["../../asset-modules/_images/file.png"].src).toBeDefined();
	expect(assets["file.txt?foo"].file).toMatch(/\/app\/file\.[a-f0-9]+\.txt\?foo/);
	expect(assets["file.txt?foo"].src).toBeDefined();
});
