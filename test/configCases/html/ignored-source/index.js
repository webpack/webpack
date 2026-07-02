import page from "./page.html";

it("should replace an alias-false src with the ignored data URL", () => {
	expect(page).toMatchSnapshot();
});
