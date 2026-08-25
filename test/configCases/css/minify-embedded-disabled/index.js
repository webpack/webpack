import text from "./style.css";

it("should leave embedded CSS alone when nothing taps the hook", () => {
	expect(text).toMatchSnapshot();
});
