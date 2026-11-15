const deferred = WATCH_STEP === "1" || WATCH_STEP === "2";

for (const [name, load] of [
	["export *", () => require("./load-star")],
	["export { b } from", () => require("./load-named")]
]) {
	it(`should ${deferred ? "defer" : "render"} the missing ${name} as package.json changes`, () => {
		if (deferred) {
			expect(load().default).toBe("a");
		} else {
			expect(load).toThrow(/Cannot find module '\.\/missing'/);
		}
	});
}
