import * as style from "./style.css";

it("should compile and load style on demand", done => {
	expect(style).toEqual(nsObj({}));
	import("./style2.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
		expect(style.getPropertyValue("margin")).toBe(" 10px");
		expect(style.getPropertyValue("color")).toBe(" green");
		expect(style.getPropertyValue("padding")).toBe(" 20px 10px");
		done();
	}, done);
});
