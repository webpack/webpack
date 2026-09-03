import "./page.html";

it("should trim an inline script but leave a data block alone", () => {
	// The emitted page is the assertion — see `test.config.js`.
	expect(true).toBe(true);
});
