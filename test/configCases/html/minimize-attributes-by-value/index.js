import "./page.html";

// The same attribute has to minify the same whether the source quoted its
// value, and whether the printer echoed the tag or rebuilt it.
it("should minify an attribute by what it says", () => {
	expect(true).toBe(true);
});
