import page from "./page.html";

it("should strip a UTF-8 BOM from the HTML source", () => {
	expect(page.charCodeAt(0)).not.toBe(0xfeff);
	expect(page).toContain("<!DOCTYPE html>");
	expect(page).toMatchSnapshot();
});
