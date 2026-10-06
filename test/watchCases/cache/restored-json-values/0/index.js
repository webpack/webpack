import data from "./data.json";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

it("should refresh a restored JSON module's values", () => {
	const step = Number(WATCH_STEP);
	expect(data).toEqual({ value: step + 1, nested: { deep: `deep-${step}` } });
	expect(emitted("bundle.js")).not.toContain(`deep-${step - 1}`);
});
