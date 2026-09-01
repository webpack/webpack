it("loads the CSS of an async chunk on a target without a document", async () => {
	const { renderButton } = await import("./button");

	expect(renderButton("Buy")).toBe('<button class="button">Buy</button>');
	expect(__webpack_css_server_styles__).toContain("rebeccapurple");
});
