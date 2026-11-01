it("should run a require.ensure callback whose block lost every module", () => {
	expect(global.requireEnsureCallbackRan).toBe(true);
	delete global.requireEnsureCallbackRan;
});
