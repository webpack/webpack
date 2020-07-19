it("should handle optional members", () => {
	expect(
		module.hot?.accept((() => {throw new Error("fail")})())
	).toBe(null);
});
