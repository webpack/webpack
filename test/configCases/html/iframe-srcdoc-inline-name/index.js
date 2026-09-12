import home from "./home.html";

it("should name a srcdoc's inline script after the page embedding it", () => {
	// `home.html` carries the srcdoc, so the extracted body is `home.js` —
	// not a name of webpack's own invention.
	expect(home).toMatch(/src=&quot;home\.js&quot;/);
});
