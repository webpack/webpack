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

if (WATCH_STEP === "2") {
	it("should reuse the deferred barrels' code when nothing they render changed", () => {
		const modules = [].concat(...STATS_JSON.children.map((child) => child.modules));
		const barrels = modules.filter((m) => /pkg\/(star|named)/.test(m.name));
		expect(barrels).toHaveLength(4);
		for (const barrel of barrels) expect(barrel.codeGenerated).toBe(false);
	});
}
