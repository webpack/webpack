it("should import an external css", done => {
	import("./style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
		expect(style.getPropertyValue("color")).toBe(" green");
		done();
	}, done);
});
