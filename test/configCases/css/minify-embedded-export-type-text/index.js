import text from "./style.css";

it("should minify CSS embedded in JS as text", () => {
	expect(text).toMatchSnapshot();
});
