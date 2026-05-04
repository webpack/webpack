it("should call the createStylesheet hook for each stylesheet link", async () => {
	await import("./style.css");

	const links = [...document.getElementsByTagName("link")];
	const styleLink = links.find((link) => /style_css/.test(link.href));

	expect(styleLink).toBeDefined();
	expect(styleLink.getAttribute("data-insert-marker")).toBe(
		"via-create-stylesheet"
	);
});
