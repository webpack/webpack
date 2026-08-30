import "./style.css";

it("should apply the initial stylesheet", done => {
	import("./lazy.js").then(({ default: value }) => {
		expect(value).toBe(42);
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
		done();
	}, done);
});

it("should not emit the css chunk loading runtime", () => {
	// Every chunk with css is initial here, so the loading runtime could never
	// run — only the javascript one is needed.
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	// Split so this module's own source, which the bundle embeds, is not a match.
	const handler = suffix => `__webpack_require__.f.${suffix}`;
	expect(source).toContain(handler("j"));
	expect(source).not.toContain(handler("css"));
	expect(source).not.toContain(`data-webpack-${"loading"}`);
});
