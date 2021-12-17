it("should import an external css", done => {
	import("./style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("color")).toBe(" green");
		expect(style.getPropertyValue("background")).toBe(
			" url(//example.com/image.png) url(https://example.com/image.png)"
		);
		expect(style.getPropertyValue("background-image")).toBe(
			" url(http://example.com/image.png)"
		);
		done();
	}, done);
});
