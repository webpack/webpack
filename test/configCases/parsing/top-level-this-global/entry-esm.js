const topLevelThis = this;

export const marker = "esm";

it("should keep the top level this of an ES module undefined", () => {
	expect(topLevelThis).toBe(undefined);
	expect(marker).toBe("esm");
});
