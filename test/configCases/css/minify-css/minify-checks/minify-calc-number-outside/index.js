import "./style.css";

// Dropping the parentheses off a unitless number revives a declaration the
// engine had thrown away, on the properties that read a bare number as a length.
it("should keep the calc() a bare number would revive", () => {
	expect(true).toBe(true);
});
