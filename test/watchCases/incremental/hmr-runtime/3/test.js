it("should keep the running modules after a syntax error", async () => {
	expect(await HMR_STATE.runtime.update()).toBeNull();
	expect(HMR_STATE.runtime.status()).toBe("idle");
	expect(HMR_STATE.runtime.read()).toEqual({ value: 23, previous: 2 });
});
