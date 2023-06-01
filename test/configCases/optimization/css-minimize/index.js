import * as style from "./style.css";

it("should compile and load style on demand", done => {
	expect(style).toEqual(nsObj({}));
	import("./style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
		done();
	}, done);
});
