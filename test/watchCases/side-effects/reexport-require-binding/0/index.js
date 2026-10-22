import * as lib from "./lib";

const libSource = () => String(__webpack_modules__["./lib.js"]);

it("should re-export the side-effect-free target in every step", () => {
	expect(lib.value).toBe("value");
	expect(lib.whole.value).toBe("value");
	expect(lib.direct).toBe(WATCH_STEP === "1" ? "other" : "none");
});

it("should read the binding only while its own require is active", () => {
	if (WATCH_STEP === "1") {
		// the binding is read directly too, so the re-exports reuse it
		expect(libSource()).toMatch(/exports\.value = target\.value;/);
		expect(libSource()).toMatch(/exports\.whole = target;/);
	} else {
		// only the re-exports read it, so the binding is `0` and they require
		expect(libSource()).toMatch(/const target = 0;/);
		expect(libSource()).not.toMatch(/exports\.whole = target;/);
	}
});
