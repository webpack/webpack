this.fromNoCommonJs = "global";

it("should map the top level this with CommonJS parsing off", () => {
	// `this` is the rewritten global here, so reading it back proves the option
	// applied without any CommonJS syntax being parsed
	expect(this.fromNoCommonJs).toBe("global");
});
