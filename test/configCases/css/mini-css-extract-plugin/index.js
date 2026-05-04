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

it("should work with different layer at-rules", async () => {
	await import("./layer-at-rule.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /layer-at-rule/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with different supports at-rules", async () => {
	await import("./supports-at-rule.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /supports-at-rule/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with fonts", async () => {
	await import("./fonts.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /fonts/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with css modules", async () => {
	const styles = await import("./style.module.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /style_module_css/.test(item.href)).sheet.css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
});

it("should work with css modules when named export false", async () => {
	const styles = await import("./style.module.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /style_module_css/.test(item.href)).sheet.css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
});

it("should work nested CSS modules", async () => {
	await import("./nested.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /nested/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with match resource", async () => {
	await import("./match-resource-url.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /match-resource-url/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with shared `@import`", async () => {
	await import("./shared-import.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.filter((item) => /shared-import/.test(item.href)).map((item) => item.sheet.css)).toMatchSnapshot();
});

it("should work with different order of CSS modules in async chunks", async () => {
	await import("./async-different-order.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.filter((item) => /async-different-order/.test(item.href)).map((item) => item.sheet.css)).toMatchSnapshot();
});

it("should work with composes in async chunks", async () => {
	await import("./composes-async.js");
});

it("should work with local `@import` with media query, supports and layer", async () => {
	await import("./local-at-import-with-media.css");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /local-at-import-with-media/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with `@import` in the entry", async () => {
	await import("./at-import-in-the-entry.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /at-import-in-the-entry_js/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with deeply chained local `@import`", async () => {
	await import("./at-import-chain.js");

	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /at-import-chain_js/.test(item.href)).sheet.css).toMatchSnapshot();
});

it("should work with multiple async chunks importing the same CSS in different order", async () => {
	const one = await import("./content-entries-one.js");
	const two = await import("./content-entries-two.js");

	expect(one.default).toBe("one");
	expect(two.default).toBe("two");

	const links = [...document.getElementsByTagName("link")];

	expect(
		links
			.filter((item) => /content-entries-(one|two)_js/.test(item.href))
			.map((item) => item.sheet.css)
	).toMatchSnapshot();
});
