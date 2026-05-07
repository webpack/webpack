import page from "./page.html";

it("should concatenate HTML module", () => {
	expect(Object.keys(__webpack_modules__).length).toBe(1);
	expect(page).toMatchSnapshot();
});
