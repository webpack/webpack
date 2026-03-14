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
	expect(map.sources).toStrictEqual([
		"webpack:///css ./bar.css",
		"webpack:///css ./foo.css"
	]);
	expect(() => {
		readFile("bundle0.js.map");
	}).toThrow();
});
