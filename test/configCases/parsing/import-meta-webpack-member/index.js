it("should read a property of import.meta.webpack from the number", () => {
	const version = import.meta.webpack;
	expect(typeof version).toBe("number");
	expect(import.meta.webpack.toFixed(1)).toBe(`${version}.0`);
	expect(import.meta.webpack.e1).toBeUndefined();
});
