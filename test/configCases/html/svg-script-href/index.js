import page from "./page.html";

it("should bundle SVG <script xlink:href> and <script href> as entry chunks", () => {
	expect(page).not.toContain("./entry.js");
	expect(page).not.toContain("./entry2.js");
	expect(page).toMatch(/<script xlink:href="__html_[^"]+\.chunk\.js">/);
	expect(page).toMatch(/<script href="__html_[^"]+\.chunk\.js">/);
	expect(page).toMatchSnapshot();
});

it("should not inline script content when href is present", () => {
	expect(page).not.toContain("data:text/javascript");
});
