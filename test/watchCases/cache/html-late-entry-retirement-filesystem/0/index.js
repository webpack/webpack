import trigger from "./trigger.js";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const vm = __non_webpack_require__("vm");

it("should retire removed HTML entries and restore their current sources", () => {
	expect(trigger).toBe([0, 1, 1, 3, 3, 3, 6, 6][Number(WATCH_STEP)]);
	const present = ["0", "1", "4", "7"].includes(WATCH_STEP);
	const asset = STATS_JSON.assets.find((candidate) => candidate.name === "app.js");
	expect(Boolean(asset)).toBe(present);
	const filename = path.join(__dirname, "app.js");
	expect(fs.existsSync(filename)).toBe(present);
	if (present) {
		const state = {};
		vm.runInNewContext(fs.readFileSync(filename, "utf8"), state);
		expect(state.value).toBe(WATCH_STEP === "7" ? 3 : WATCH_STEP === "4" ? 2 : 1);
	}
});
