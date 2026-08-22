import fat from "./fat";
import a from "./a";
import b from "./b";

it("should raise an error when hints are errors", () => {
	expect(fat.length).toBe(80000);
	expect([a, b]).toHaveLength(2);
});
