import { FLAG, NUM } from "./env";
import { REEXPORTED_NUM } from "./reexport";
import "./trigger";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should refresh the inlined constants a cached build baked into consumers", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expectedFlag = WATCH_STEP === "0" ? "on" : "off";
	const expectedNum = WATCH_STEP === "2" ? 6 : 5;
	expect(FLAG).toBe(expectedFlag);
	expect(NUM).toBe(expectedNum);
	expect(REEXPORTED_NUM).toBe(expectedNum);
	expect(source).toContain(
		`(/* inlined export .FLAG */${JSON.stringify(expectedFlag)})`
	);
	expect(source).toContain(`(/* inlined export .NUM */${expectedNum})`);
});
