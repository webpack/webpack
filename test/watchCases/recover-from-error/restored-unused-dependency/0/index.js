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

it("should follow new URL() targets that swap which one is missing", () => {
	// separate entries, so concatenation does not put both pairs in one module
	expect(require("./swap-entry").a).toBe(1);
	expect(require("./swap-unnamed-entry").b).toBe(1);
	const source = __non_webpack_require__("fs").readFileSync(__filename, "utf-8");
	const missing = (file) =>
		source.includes(["Cannot find module", `'./${file}'`].join(" "));
	// one target of each pair is missing at every step but 3, so only which
	// one tells the steps apart
	const swapped = WATCH_STEP === "1" || WATCH_STEP === "2";
	const both = WATCH_STEP === "3";
	// a and b have module ids (other.js uses them), swap-unnamed's c and d none
	expect(missing("swap-a.js")).toBe(swapped);
	expect(missing("swap-b.js")).toBe(!swapped && !both);
	expect(missing("swap-c.js")).toBe(swapped);
	expect(missing("swap-d.js")).toBe(!swapped && !both);
});
