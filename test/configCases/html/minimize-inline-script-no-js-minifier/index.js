import "./page.html";

it("should trim an inline script where no JavaScript minifier is wired", () => {
	// The emitted page is the assertion — see `test.config.js`.
	expect(true).toBe(true);
});
