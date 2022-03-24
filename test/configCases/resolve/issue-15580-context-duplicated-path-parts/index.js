it("webpackContext resolves with a correct path", async () => {
	const contextRequire = import.meta.webpackContext("b", {
		recursive: false,
		regExp: /\.js$/,
	});
	expect(contextRequire("./1.js")).toBe(1);
	expect(contextRequire("./2.js")).toBe(2);
	expect(contextRequire.keys()).toMatchObject(['./1.js', './2.js']);
});
