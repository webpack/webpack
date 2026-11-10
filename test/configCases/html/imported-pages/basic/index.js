import page from "./page.html";

it("basic: should compile and export html as string", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
});
