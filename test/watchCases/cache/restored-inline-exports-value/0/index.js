import values from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should refresh a restored consumer's inlined export values", () => {
	const [num, flag] = WATCH_STEP === "0" ? [5, "on"] : [6, "off"];
	expect(values).toEqual([num, flag]);
	const bundle = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	expect(bundle).toContain(`inlined export .NUM */${num}`);
	expect(bundle).toContain(`inlined export .FLAG */${JSON.stringify(flag)}`);
	// A fresh compiler builds the consumer from the restored disk cache
	const consumer = STATS_JSON.modules.find((m) => m.name === "./consumer.js");
	expect(consumer.cached).toBe(WATCH_STEP !== "0");
});
