"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("loads the chunk whose name holds a space and a percent sign", async () => {
	const { value } = await import(/* webpackChunkName: "a b%41" */ "./value");
	expect(value).toBe("MARK");
});

it("encodes the space and the percent sign of a file in its manifest url", () => {
	const files = manifest["./value.js"];
	expect(files).toContain("/static/sub%20dir/a%20b%2541.js");
	expect(files.map((file) => decodeURI(file))).toContain(
		"/static/sub dir/a b%41.js"
	);
});

it("keeps the query of a file as written in its manifest url", async () => {
	const { file } = await import(/* webpackChunkName: "a b%41" */ "./value");
	expect(file).toBe("/static/asset dir/file.txt?v=%2F");
	expect(manifest["./value.js"]).toContain(
		"/static/asset%20dir/file.txt?v=%2F"
	);
});
