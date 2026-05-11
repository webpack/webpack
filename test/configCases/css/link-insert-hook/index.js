it("should call the linkInsert hook to control where the link is inserted", async () => {
	await import("./style.css");

	const links = [...document.getElementsByTagName("link")];
	const styleLink = links.find((link) => /style_css/.test(link.href));

	expect(styleLink).toBeDefined();
	expect(styleLink.getAttribute("data-link-insert")).toBe("custom");
	// hook redirected insertion away from <head> and into <body>.
	expect(styleLink.parentNode).toBe(document.body);
});
