this.fromNoCommonJs = "global";

it("should map the top level this with CommonJS parsing off", () => {
	expect(globalThis["fromNoCommonJs"]).toBe("global");
});
