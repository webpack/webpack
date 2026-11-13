it("should emit a .js file referenced via new URL as an asset even with a javascript/auto rule", () => {
	const url = new URL("./source.js", import.meta.url);
	expect(url.href).toMatch(/source\.js$/);
});
