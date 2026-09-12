import { FLAG, NUM } from "./env";
import { REEXPORTED_NUM } from "./reexport";
import "./trigger";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const expectedFlag = WATCH_STEP === "0" ? "on" : "off";
const expectedNum = WATCH_STEP === "2" ? 6 : 5;

it("should refresh the inlined constants a cached build baked into consumers", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	expect(FLAG).toBe(expectedFlag);
	expect(NUM).toBe(expectedNum);
	expect(REEXPORTED_NUM).toBe(expectedNum);
	expect(source).toContain(
		`(/* inlined export .FLAG */${JSON.stringify(expectedFlag)})`
	);
	expect(source).toContain(`(/* inlined export .NUM */${expectedNum})`);
});

it("should refresh the literal a re-exporter with side effects bakes into its getter", () =>
	import("./reexport-side-effect").then(({ SIDE_EFFECT_NUM }) => {
		expect(SIDE_EFFECT_NUM).toBe(expectedNum);
		delete global.__inlineExportsBarrel;
	}));
