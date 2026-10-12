it("should accept an update and retain dispose data", async () => {
	expect(await HMR_STATE.runtime.update()).toContain("./value.js");
	expect(HMR_STATE.runtime.read()).toEqual({ value: 12, previous: 1 });
	expect(HMR_STATE.state.disposed).toEqual(["value:1"]);
});
