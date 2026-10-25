it("should collect concurrent stylesheets in request order", async () => {
	const previous = __webpack_css_server_styles__;
	const first = import(/* webpackChunkName: "first" */ "./first.css");
	const duplicate = import(/* webpackChunkName: "first" */ "./first.css");
	require("./injected.css");
	const second = import(/* webpackChunkName: "second" */ "./second.css");

	const pendingCss = __webpack_css_server_styles__;

	await Promise.all([first, duplicate, second]);

	if (typeof document !== "undefined") {
		const links = document.getElementsByTagName("link");
		expect(links).toHaveLength(2);
		expect(links[0].href).toContain("/first.css");
		expect(links[1].href).toContain("/second.css");
	} else {
		if (previous) expect(pendingCss).toBe(previous);
		expect(pendingCss).toContain("color: blue");
		expect(pendingCss).not.toContain("undefined");
		const css = __webpack_css_server_styles__;
		expect(css).toContain("color: red");
		expect(css).toContain("color: green");
		expect(css.indexOf("color: red")).toBeLessThan(css.indexOf("color: blue"));
		expect(css.indexOf("color: blue")).toBeLessThan(css.indexOf("color: green"));
		await import("./first.css");
		expect(__webpack_css_server_styles__).toBe(css);
	}
});
