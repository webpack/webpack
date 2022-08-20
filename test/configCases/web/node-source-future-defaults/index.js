import "./no-warn"

it("global", () => {
	expect(typeof global).toBe("object");
});

it("__filename", () => {
	expect(typeof __filename).toBe("string");
});

it("__dirname", () => {
	expect(typeof __dirname).toBe("string");
});
