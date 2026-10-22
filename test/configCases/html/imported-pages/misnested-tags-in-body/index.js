import page from "./page.html";

it("misnested-tags-in-body: should handle various misnested tags and aliases in the body", () => {
	expect(page).toMatchSnapshot();
});
