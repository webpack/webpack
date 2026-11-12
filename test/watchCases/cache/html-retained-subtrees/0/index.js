const value = require("./package");
const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const vm = __non_webpack_require__("vm");

it("should restore late subtrees without caching and retire their removed imports", () => {
	const step = Number(WATCH_STEP);
	expect(value).toBe(step === 0 ? "a" : "b");
	const state = {};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), state);
	expect(state.value).toBe(value);
	expect(state.page !== undefined).toBe(step < 2);
	expect(STATS_JSON.modules.some((module) => module.name === "./orphan.js")).toBe(step < 2);
	if (step === 2) {
		expect(STATS_JSON.assets.some((asset) => asset.name === "shared.html")).toBe(true);
		expect(STATS_JSON.assets.some((asset) => asset.name === "landing.js")).toBe(false);
	}
});
