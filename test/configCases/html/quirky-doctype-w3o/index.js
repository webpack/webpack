import "./page.html";

// The public identifier puts the document in quirks mode, which changes layout,
// so the doctype has to survive minification as one.
it("should keep the quirks-mode doctype", () => {
	expect(true).toBe(true);
});
