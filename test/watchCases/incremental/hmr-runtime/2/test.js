it("should dispose and remove a detached module", async () => {
	expect(await HMR_STATE.runtime.update()).toContain("./children/old.js");
	expect(HMR_STATE.runtime.read()).toEqual({ value: 23, previous: 2 });
	expect(HMR_STATE.runtime.cached("./children/old.js")).toBe(false);
	expect(HMR_STATE.state.disposed.slice().sort()).toEqual([
		"child:10", "value:1", "value:2"
	]);
});
