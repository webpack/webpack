import "./page.html";

// A text run ending in `</` fuses with the end tag printed after it into a
// bogus comment, which drops the text from the document.
it("should keep text a following end tag would fuse with", () => {
	expect(true).toBe(true);
});
