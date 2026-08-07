import html from "./page.html";

it("should keep an HTML module out of concatenation when HMR is enabled", () => {
	expect(html).toContain("<p>hmr page</p>");
});
