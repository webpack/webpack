import page from "./page.html";

it("should report a module-not-found error and render a data: placeholder", () => {
	expect(page).toMatchSnapshot();
});
