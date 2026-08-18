import "./page.html";

it("should emit the page", () => {
	// The emitted document is what `syntaxEquivalence` compares; this keeps a
	// runnable entry so the chunk and its `.html` are produced.
	expect(true).toBe(true);
});
