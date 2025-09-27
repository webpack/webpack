import used from "./used";
import ignored from "./ignored";
import fs from "fs";

const getSourceMap = () => {
	const source = fs.readFileSync(__filename, "utf-8");
	const match =
		/\/\/# sourceMappingURL\s*=\s*data:application\/json;charset=utf-8;base64,(.*)\\n\/\/#/.exec(
			source
		);
	const mapString = Buffer.from(match[1], "base64").toString("utf-8");
	return JSON.parse(mapString);
};

const map = getSourceMap();

console.log(map);


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
