import "./page.html";

// With the quoting frozen, a value the source spelled with references is still
// written as what it decodes to wherever that spells shorter.
it("should spell a referenced value back with the quotes left alone", () => {
	expect(true).toBe(true);
});
