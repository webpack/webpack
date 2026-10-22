import page from "./page.html";

it("entity-decode: decodes HTML entities in an extracted attribute URL", () => {
	expect(page).toMatchSnapshot();
});
