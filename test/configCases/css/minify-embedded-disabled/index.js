import text from "./style.css";

it("should leave embedded CSS alone when minimize.css is false", () => {
	expect(text).toMatchSnapshot();
});
