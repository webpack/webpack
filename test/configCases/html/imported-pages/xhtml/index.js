import page from "./page.html";

it("xhtml: should compile and export html as string", () => {
	expect(page).toMatchSnapshot();
});
