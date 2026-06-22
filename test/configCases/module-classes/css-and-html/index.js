import page from "./page.html";
import * as style from "./style.css";

it("should create dedicated css and html module classes", () => {
	expect(style).toEqual({});
	expect(typeof page).toBe("string");
	expect(page).toMatch(/<h1>Hello<\/h1>/);
});
