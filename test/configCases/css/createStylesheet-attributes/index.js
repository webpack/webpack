it("should apply mini-css-extract-plugin-style attributes/linkType via createStylesheet hook", async () => {
	await import("./style.css");

	const links = [...document.getElementsByTagName("link")];
	const styleLink = links.find((link) => /style_css/.test(link.href));

	expect(styleLink).toBeDefined();
	expect(styleLink.getAttribute("id")).toBe("main-styles");
	expect(styleLink.getAttribute("data-theme")).toBe("dark");
	expect(styleLink.type).toBe("text/css");
});
