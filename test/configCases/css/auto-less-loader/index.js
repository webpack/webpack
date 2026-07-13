import "./global.less";

it("should use auto-enabled built-in css with less-loader without extra config", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" green");
});
