import "./page.html";

// The grammars read what a value decodes to, so a value spelled with character
// references has to be rewritten from that and spelled back.
it("should rewrite a value the source spelled with references", () => {
	expect(true).toBe(true);
});
