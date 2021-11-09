it("global", () => {
	expect(typeof global).toBe("undefined");
});

it("__filename", () => {
	expect(typeof __filename).toBe("undefined");
});

it("__dirname", () => {
	expect(typeof __dirname).toBe("undefined");
});
