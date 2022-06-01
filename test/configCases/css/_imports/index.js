import * as style from "./style.css";

/**
 * This test is not working due to missing support of @media, @supports and
 * @layer in JSDOM (which relies on CSSOM).
 **/
it("should compile at import rules", done => {
	expect(style).toEqual(nsObj({}));
	import("./style2.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" orange");
		expect(style.getPropertyValue("display")).toBe(" flex");
		expect(style.getPropertyValue("font-size")).toBe(" 32px");
		expect(style.getPropertyValue("color")).toBe(" orange");
		expect(style.getPropertyValue("padding")).toBe(" 20px 10px");
		done();
	}, done);
});
