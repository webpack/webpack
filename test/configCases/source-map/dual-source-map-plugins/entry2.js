import fs from "fs";
import path from "path";

const readFile = (filename) => {
	return fs.readFileSync(path.join(__dirname, filename), "utf-8");
};

const getSourceMap = (filename) => {
	return JSON.parse(readFile(filename));
};

it("should compile successfully and have dual sourcemap", () => {
	expect(() => {
		getSourceMap("bundle1.js.map");
	}).toThrow();

	var bundle1 = readFile("bundle1.js");
	expect(bundle1).toMatch('eval("');

	let map = getSourceMap("runtime~bundle1.js.runtime.map");
	for (const source of map.sources) {
		// Should only include webpack runtime module
		expect(source.startsWith("webpack:///webpack")).toBe(true);
	}
});
