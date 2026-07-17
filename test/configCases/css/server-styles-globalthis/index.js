it("collects server css via native globalThis when the target supports it", (done) => {
	import("./style.css").then(() => {
		const css = __webpack_css_server_styles__;

		expect(typeof css).toBe("string");

		if (typeof document === "undefined") {
			// SSR: the async css chunk is read from disk into the server registry
			expect(css).toContain("color: red");
		} else {
			// browser: css is applied to the DOM, the server registry stays empty
			expect(css).toBe("");
		}

		done();
	}, done);
});
