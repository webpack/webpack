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
