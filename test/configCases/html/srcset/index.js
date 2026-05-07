import page from "./page.html";

it("should work and handle different syntax", () => {
	expect(page).toMatchSnapshot();
});
