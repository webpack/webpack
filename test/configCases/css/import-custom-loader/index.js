import "./style.css";

it("should let a custom loader handle a specific @import request", () => {
	const style = getComputedStyle(document.body);
	// `color` comes from imported.css, where the `css-import`-scoped loader
	// replaced the placeholder — proof the loader ran on the @import.
	expect(style.getPropertyValue("color")).toBe(" green");
	// `padding` comes from the JS-imported entry style.css, which the
	// import-only loader never touched.
	expect(style.getPropertyValue("padding")).toBe(" 10px");
});
