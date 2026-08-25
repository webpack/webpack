import css from "./style.css";
import page from "./page.html";

it("should reach an svg payload inside a data: url in embedded CSS", () => {
	expect(css).toMatchSnapshot();
});

it("should reach an inline svg subtree in embedded HTML", () => {
	expect(page).toMatchSnapshot();
});
