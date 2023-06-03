import "./style.css";

it("should compile", done => {
	import("./style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe("red");
		done();
	}, done);
});
