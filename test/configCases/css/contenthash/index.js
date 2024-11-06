import * as style from "./style.css";

it("should work with js", done => {
	import('./async.js').then(x => {
		expect(x.name).toBe("async")
		done();
	}, done);
});

it("should work with css", done => {
	expect(style).toEqual(nsObj({}));

	const computedStyle = getComputedStyle(document.body);

	expect(computedStyle.getPropertyValue("background")).toBe(" green");
	expect(computedStyle.getPropertyValue("color")).toBe(" yellow");

	import("./async.css").then(x => {
		expect(x).toEqual(nsObj({}));

		const style = getComputedStyle(document.body);

		expect(style.getPropertyValue("background")).toBe(" yellow");
		expect(style.getPropertyValue("color")).toBe(" green");

		done();
	}, done);
});
