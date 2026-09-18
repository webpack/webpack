import "./index.css";

it("should replace identifiers in CSS", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" red");
	expect(style.getPropertyValue("content")).toBe(" \"dark\"");
});
