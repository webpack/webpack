import stylesheet from "./style.css";

it("should emit the stylesheet with its namespace declarations", () => {
	expect(stylesheet).toBe("style.css");
});
