import page from "./page.html";

it("broken-html-syntax: should compile and export html as string", () => {
	expect(page).toMatchSnapshot();
});
