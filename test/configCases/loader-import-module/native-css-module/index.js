it("should return native CSS-module exports from a direct loader import", () => {
	expect(classes).toEqual({
		button: "button",
		title: "title"
	});
});
