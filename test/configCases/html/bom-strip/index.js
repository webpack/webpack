import loaded from "./loaded.html";
import page from "./page.html";

it("should strip a UTF-8 BOM from the HTML source", () => {
	expect(page.charCodeAt(0)).not.toBe(0xfeff);
	expect(page).toContain("<!DOCTYPE html>");
	// Offsets are taken after the BOM, so the rewrite lands on the value itself
	expect(page).toMatch(/<img src="[0-9a-f]+\.svg" alt="after-bom">/);
	expect(page).toMatchSnapshot();
});

it("should strip a BOM a loader puts in front of the HTML", () => {
	expect(loaded.charCodeAt(0)).not.toBe(0xfeff);
	expect(loaded).toMatch(/<img src="[0-9a-f]+\.svg" alt="loader-bom">/);
});
