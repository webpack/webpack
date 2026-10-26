import page from "./page.html";

it("should run the loader registered for a <style lang> body's mimetype", () => {
	expect(page).toContain(".plain { color: red; }");
	expect(page).toContain(".css-lang { color: blue; }");
	expect(page).toContain("css data:text/css;base64,");

	expect(page).toContain("css data:text/x-less;base64,");
	expect(page).not.toContain("@accent");
	expect(page).toMatch(/\.less-lang \{\s*color: green;\s*\}/);
	expect(page).toMatch(/\.less-lang \.nested \{\s*background: url\(handled-pixel\.png\);\s*\}/);

	expect(page).toContain("css data:text/x-scss;base64,");
	expect(page).not.toContain("$accent");
	expect(page).toContain(".scss-lang { color: purple; }");
});
