import value from "./wrapper";

it("should resolve again a dependency the unsafe cache no longer holds", () => {
	expect(value).toBe(WATCH_STEP);
	if (WATCH_STEP === "0") {
		expect(require("./unchanged-module").default).toBe("unchanged");
	} else if (WATCH_STEP === "1") {
		expect(() => require("./unchanged-module")).toThrow(
			/Cannot find module '\.\/unchanged-module'/
		);
	} else {
		expect(require("./unchanged-module").default).toBe("shared");
	}
});
