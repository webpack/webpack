import page from "./page.html";

it("should compile and export html as string", () => {
	expect(page).toMatchSnapshot();
});
