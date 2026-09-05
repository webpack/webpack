it("should settle a css chunk load where the stylesheet cannot be read", () =>
	import("./lazy.css").then(() => {
		expect(__webpack_css_server_styles__).not.toContain("rebeccapurple");
	}));
