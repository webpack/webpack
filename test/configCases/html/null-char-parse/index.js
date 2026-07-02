import page from "./page.html";

it("should compile HTML containing null characters", () => {
	expect(page).toMatchSnapshot();
});
