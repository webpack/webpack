import page from "./page.html";

it("should support an async template function", () => {
	expect(page).toContain("<title>Hello async</title>");
	expect(page).not.toContain("{{title}}");
	expect(page).not.toContain('src="./image.png"');
	expect(page).toMatch(/<img src="[^"]+\.png" alt="image">/);
});
