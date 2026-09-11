import data from "./data.json";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should refresh values a cached JSON module handed to its consumers", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const step = Number(WATCH_STEP);
	expect(data.value).toBe(step + 1);
	expect(data.nested.deep).toBe(`deep-${step}`);
	expect(source).toContain(`deep-${step}`);
	expect(source).not.toContain(`deep-${step - 1}`);
});
