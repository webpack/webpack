it("should propagate child updates and preserve runtime state", async () => {
	expect(await HMR_STATE.runtime.update()).toContain("./children/new.js");
	expect(HMR_STATE.runtime.read()).toEqual({ value: 34, previous: 4 });
	expect(HMR_STATE.runtime.state()).toBe(HMR_STATE.state);
	expect(HMR_STATE.state.entries).toBe(1);
	expect(HMR_STATE.state.accepted).toEqual([12, 23, 24, 34]);
	expect(HMR_STATE.state.disposed.slice().sort()).toEqual([
		"child:10", "child:20", "value:1", "value:2", "value:3", "value:4"
	]);
	expect(HMR_STATE.runtime.status()).toBe("idle");
});
