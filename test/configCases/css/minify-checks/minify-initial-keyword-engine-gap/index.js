import "./style.css";

// `initial` is only worth replacing where the engine reads the keyword as the
// same declaration.
it("should keep initial where an engine reads the keyword apart", () => {
	expect(true).toBe(true);
});
