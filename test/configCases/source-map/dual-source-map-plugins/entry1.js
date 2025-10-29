import fs from "fs";
import path from "path";

const getSourceMap = (filename) => {
	const content = fs.readFileSync(path.join(__dirname, filename), "utf-8");
	return JSON.parse(content);
};

it("should compile successfully and have dual sourcemap", () => {
	let map = getSourceMap("bundle0.js.map");
	expect(map.sources).toContain("webpack:///./entry1.js")

	map = getSourceMap("runtime~bundle0.js.runtime.map");
	for (const source of map.sources) {
		// Should only include webpack runtime module
		expect(source.startsWith("webpack:///webpack")).toBe(true)
	}

});
