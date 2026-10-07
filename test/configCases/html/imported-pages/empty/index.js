import page from "./page.html";

it("empty: should compile and export html as string", () => {
	expect(page).toMatchSnapshot();
});
