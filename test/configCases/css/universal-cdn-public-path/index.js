it("should settle a css chunk load where the stylesheet is not on disk", () =>
	import("./lazy.css").then(() => {
		expect(__webpack_css_server_styles__).not.toContain("rebeccapurple");
	}));
