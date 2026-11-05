import text from "./main.css";

it("should render a stylesheet imported twice once, at its last position", () => {
	const selectors = text.match(/\.[a-z]+(?= \{)/g);
	expect(selectors).toEqual([".left", ".shared", ".right", ".main"]);
});
