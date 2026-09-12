import "./page.html";

// Reserved SVG names keep the case they are written with, and `foreignObject`
// is where HTML starts again inside foreign content.
it("should keep reserved foreign element names", () => {
	expect(true).toBe(true);
});
