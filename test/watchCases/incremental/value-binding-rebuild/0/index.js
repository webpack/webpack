import { value } from "./m";

it("should keep value bindings for rebuilt non-circular modules", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const content = fs.readFileSync(path.resolve(__dirname, "bundle.js"), "utf8");
	// split so this test source never matches itself inside the bundle
	const bindingCount = content.split(`0, /* bind${"ing */"}`).length;
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
	if (WATCH_STEP === "0") {
		expect(bindingCount).toBeGreaterThan(1);
		STATE.bindingCount = bindingCount;
	} else {
		// a rebuild must not fall back from value bindings to export getters
		expect(bindingCount).toBe(STATE.bindingCount);
	}
});
