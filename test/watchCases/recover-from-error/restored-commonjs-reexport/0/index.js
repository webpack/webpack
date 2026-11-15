const missing = WATCH_STEP === "1";

it("should provide a CommonJS re-export again once its target is restored", () => {
	if (missing) {
		expect(() => require("./name-barrel")).toThrow(/Cannot find module/);
		expect(() => require("./whole-barrel")).toThrow(/Cannot find module/);
		return;
	}
	const name = require("./name-barrel");
	expect(Object.keys(name).sort()).toEqual(["b", "r"]);
	expect(name.r).toBe(2);
	const whole = require("./whole-barrel");
	expect(Object.keys(whole)).toEqual(["a"]);
	expect(whole.a).toBe(2);
});

it("should provide a CommonJS re-export once its target appears", () => {
	if (!missing) {
		expect(() => require("./later-barrel")).toThrow(/Cannot find module/);
		return;
	}
	const later = require("./later-barrel");
	expect(Object.keys(later).sort()).toEqual(["b", "r"]);
	expect(later.r).toBe(2);
});
