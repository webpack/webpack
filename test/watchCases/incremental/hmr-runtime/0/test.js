it("should start one retained HMR runtime", () => {
	HMR_STATE.runtime = require(BUNDLE_PATH);
	HMR_STATE.state = HMR_STATE.runtime.state();
	expect(HMR_STATE.runtime.read()).toEqual({ value: 11, previous: null });
	expect(HMR_STATE.runtime.cached("./children/old.js")).toBe(true);
	expect(HMR_STATE.state.entries).toBe(1);
});
