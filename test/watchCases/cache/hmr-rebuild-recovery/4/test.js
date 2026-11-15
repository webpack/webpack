it("should recover without restarting the runtime", async () => {
	expect(await HMR_STATE.runtime.update()).toContain("./value.js");
	expect(HMR_STATE.runtime.read()).toEqual({ value: 24, previous: 3 });
});
