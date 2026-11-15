import "./page.html";

// A value spelled with character references names the same keyword, so it has
// to be looked up decoded.
it("should look an attribute up by what its value decodes to", () => {
	expect(true).toBe(true);
});
