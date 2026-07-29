import page from "./page.html";

it("should report an error when a referenced asset is missing", () => {
	expect(page).toBeDefined();
});
