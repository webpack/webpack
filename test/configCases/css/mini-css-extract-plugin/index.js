it("should work with asset modules", async () => {
	await import("./asset-modules.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /asset-modules/.test(item.href)).sheet.css).toMatchSnapshot();
});

// TODO fix me
it("should work with multiple @charset at-rules", async () => {
	await import("./multiple-at-charset.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /multiple-at-charset/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with different media at-rules", async () => {
	await import("./media-at-rule.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /media-at-rule/.test(item.href)).sheet.css).toMatchSnapshot();
});


it("should work with fonts", async () => {
	await import("./fonts.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /fonts/.test(item.href)).sheet.css).toMatchSnapshot();
});
