import fs from "fs";
import path from "path";
import "./foo.css";

const readFile = (filename) => {
	let dirname;
	if (typeof window !== "undefined") {
		dirname = __STATS__.outputPath;
	} else {
		dirname = __dirname;
	}
	return fs.readFileSync(path.join(dirname, filename), "utf-8");
};

const getSourceMap = (filename) => {
	return JSON.parse(readFile(filename));
};

it("should compile successfully and have individual css sourcemap", async () => {
	let map = getSourceMap("bundle0.css.map");
	// hidden
	expect(readFile("bundle0.css")).not.toMatch(/\/\/ sourceMappingURL=/);
	// nosources
	expect(map).not.toHaveProperty("sourcesContent");
	// cheap
	expect(map.mappings).not.toContain(",");

	map = getSourceMap("bundle0.mjs.map");
	expect(map).toHaveProperty("sourcesContent");
	expect(map.mappings).toContain(",");
	expect(readFile("bundle0.mjs")).toMatch(/\/\/\# sourceMappingURL=/);
});
