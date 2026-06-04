"use strict";

const fs = require("fs");
const path = require("path");

describe("asset generator names", () => {
	for (const file of ["AssetBytesGenerator", "AssetSourceGenerator"]) {
		it(`${file}.js declares and exports ${file}`, () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, `../lib/asset/${file}.js`),
				"utf-8"
			);
			const declaration = source.match(/class\s+(\w+)\s+extends\s+Generator/);
			const exported = source.match(/module\.exports\s*=\s*(\w+)/);

			expect(declaration && declaration[1]).toBe(file);
			expect(exported && exported[1]).toBe(file);
		});
	}
});
