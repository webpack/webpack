import page from "./page.html";

it("invisible-space: should compile and export html as string", () => {
	expect(page).toMatchSnapshot();
});
