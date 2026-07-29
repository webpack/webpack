import page from "./page.html";

it("should handle various misnested tags and aliases in the body", () => {
	expect(page).toMatchSnapshot();
});
