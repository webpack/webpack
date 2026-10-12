// loaded from both entries, so its modules are hashed for two runtimes
export const shared = () => import(/* webpackChunkName: "shared" */ "./shared");

for (const [name, load] of [
	["export *", () => require("./star")],
	["exports.x = require()", () => require("./cjs-entry")],
	["an unused import", () => require("./esm-entry")]
]) {
	it(`should follow ${name} of a deleted and restored module`, () => {
		if (WATCH_STEP === "1" || WATCH_STEP === "2") {
			expect(load).toThrow(/Cannot find module/);
			return;
		}
		expect(load().a).toBe(1);
	});
}

it("should follow new URL() of a deleted and restored module", () => {
	expect(require("./url-entry").a).toBe(1);
	const source = __non_webpack_require__("fs").readFileSync(__filename, "utf-8");
	// two targets, so only the count of inactive ones tells the steps apart
	expect(source.includes(["Cannot find module", "'./url-dep.js'"].join(" "))).toBe(
		WATCH_STEP === "1" || WATCH_STEP === "2"
	);
});
