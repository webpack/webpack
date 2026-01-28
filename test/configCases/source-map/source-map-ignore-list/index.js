import used from "./used";
import ignored from "./ignored";
import fs from "fs";
import path from "path";

const getSourceMap = () => {
	const content = fs.readFileSync(
		path.join(__dirname, "bundle0.js.map"),
		"utf-8"
	);
	return JSON.parse(content);
};

const map = getSourceMap();

it("marks matching modules in ignoreList", () => {
	const sources = map.sources;
	const ignoredIndex = sources.findIndex((source) =>
		/ignored\.js/.test(source)
	);
	expect(ignored).toBe("ignored");
	expect(ignoredIndex).not.toBe(-1);
	expect(Array.isArray(map.ignoreList)).toBe(true);
	expect(map.ignoreList).toContain(ignoredIndex);
});

it("keeps other modules outside ignoreList", () => {
	const sources = map.sources;
	const usedIndex = sources.findIndex((source) => /used\.js/.test(source));
	expect(used).toBe("used");
	expect(usedIndex).not.toBe(-1);
	expect(map.ignoreList).not.toContain(usedIndex);
});
