import page from "./page.html";

it("should resolve the deprecated `background` attribute on body/table/td/th", () => {
	expect(page).not.toContain("./bg.png");
	expect(page).toMatch(/<body background="[0-9a-f]+\.png">/);
	expect(page).toMatch(/<table background="[0-9a-f]+\.png">/);
	expect(page).toMatch(/<th background="[0-9a-f]+\.png">/);
	expect(page).toMatch(/<td background="[0-9a-f]+\.png">/);
	expect(page).toMatchSnapshot();
});
