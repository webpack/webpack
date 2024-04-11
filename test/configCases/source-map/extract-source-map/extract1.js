const fs = require("fs");
const path = require("path");

require("./test1");

it("should extract source map", () => {
	const fileData = fs.readFileSync(path.resolve(__dirname, "bundle1.js.map")).toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toContain("webpack:///charset-inline-source-map.txt");
});
