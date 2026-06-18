import "./style.css";

it("should export a URL to a standalone CSS file when exportType is url", () => {
	const url = new URL("./style.css", import.meta.url);
	expect(url).toBeInstanceOf(URL);
	expect(url.href).toMatch(/\.css$/);
});

it("should support webpackEntryOptions magic comment", () => {
	const url = new URL(
		/* webpackEntryOptions: { "name": "named-style" } */
		"./named.css",
		import.meta.url
	);
	expect(url).toBeInstanceOf(URL);
	expect(url.href).toMatch(/\.css$/);
});

it("should deduplicate entry blocks for the same CSS file", () => {
	const url1 = new URL("./style.css", import.meta.url);
	const url2 = new URL("./style.css", import.meta.url);
	expect(url1.href).toBe(url2.href);
});
