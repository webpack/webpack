import fat from "./fat";
import a from "./a";
import b from "./b";

it("should warn about a module carrying its chunk", () => {
	expect(fat.length).toBe(80000);
	expect([a, b]).toHaveLength(2);
});
