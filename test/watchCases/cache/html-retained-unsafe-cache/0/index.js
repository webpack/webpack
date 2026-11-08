const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const vm = __non_webpack_require__("vm");

it("should restore a late subtree reached through a reused dependency", () => {
	const state = {};
	state.self = state;
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), state);
	expect(state.value).toBe(WATCH_STEP === "1" ? "empty" : "shared");
	expect(STATS_JSON.modules.some((module) => module.name === "./owner.js")).toBe(WATCH_STEP !== "2");
	expect(STATS_JSON.modules.some((module) => module.name === "./leaf.js")).toBe(true);
});
