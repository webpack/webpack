import "./style.css";

it("should work", () => {
	const computedStyle = getComputedStyle(document.body);
	expect(computedStyle.getPropertyValue("color")).toBe(" red");
	expect(computedStyle.getPropertyValue("background")).toBe(" red");
});
