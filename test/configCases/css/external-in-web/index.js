import * as style from "./style.css";

it("should import an external CSS inside CSS", () => {
	const bodyStyle = getComputedStyle(document.body);

	expect(bodyStyle.getPropertyValue("color")).toBe(" green");
	expect(bodyStyle.getPropertyValue("padding")).toBe(" 10px");
});

// import * as style1 from "http://test.com/import.css";

it("should work with an external URL", () => {
	const url = new URL("https://test.cases/url-external.css", import.meta.url);

	expect(url.toString().endsWith("url-external.css")).toBe(true);
});

it("should import an external css dynamically", done => {
	import("./dynamic.css").then(x => {
		expect(x).toEqual({});
		const bodyStyle = getComputedStyle(document.body);
		expect(bodyStyle.getPropertyValue("color")).toBe(" red");
		expect(bodyStyle.getPropertyValue("background")).toBe(
			" url(//example.com/image.png) url(https://example.com/image.png)"
		);
		expect(bodyStyle.getPropertyValue("background-image")).toBe(
			" url(http://example.com/image.png)"
		);
		done();
	}, done);
});
