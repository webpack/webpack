it("should compile and load style on demand", (done) => {
	import("./style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
		expect(style.getPropertyValue("margin")).toBe(" 10px");
		done();
	}, done);
});
