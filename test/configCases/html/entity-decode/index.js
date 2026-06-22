import page from "./page.html";

it("decodes HTML entities in an extracted attribute URL", () => {
	expect(page).toMatchSnapshot();
});
