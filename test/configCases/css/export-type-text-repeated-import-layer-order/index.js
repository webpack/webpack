import text from "./main.css";

it("should declare cascade layers in the order of their first import", () => {
	expect(text.indexOf("@layer base")).toBeGreaterThan(-1);
	expect(text.indexOf("@layer base")).toBeLessThan(
		text.indexOf("@layer theme")
	);
});

it("should render a repeated stylesheet at its first and last position", () => {
	const selectors = text.match(/\.[a-z]+(?= \{)/g);
	expect(selectors).toEqual([".shared", ".theme", ".shared", ".main"]);
});
