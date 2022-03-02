import * as style from "./style.css";

it("should compile and load style on demand", () => {
	expect(style).toEqual(nsObj({}));
	const computedStyle = getComputedStyle(document.body);
	expect(computedStyle.getPropertyValue("background")).toBe(" red");
	expect(computedStyle.getPropertyValue("margin")).toBe(" 10px");
});
