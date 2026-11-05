import text from "./main.css";
import chain from "./chain-0.css";

it("should render a stylesheet imported twice at its first and last position", () => {
	const selectors = text.match(/\.[a-z]+(?= \{)/g);
	expect(selectors).toEqual([".shared", ".left", ".shared", ".right", ".main"]);
});

it("should render each stylesheet of a deeply repeated chain at most twice", () => {
	const selectors = chain.match(/\.chain-\d+(?= \{)/g);
	const expected = [];
	// first copies, deepest first, then last copies in the same order
	for (let copy = 0; copy < 2; copy++) {
		for (let i = 19; i > 0; i--) expected.push(`.chain-${i}`);
	}
	expected.push(".chain-0");
	expect(selectors).toEqual(expected);
});
