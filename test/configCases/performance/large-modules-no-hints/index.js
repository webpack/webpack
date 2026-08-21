import fat from "./fat";
import a from "./a";
import b from "./b";

it("should stay quiet when hints are off", () => {
	expect(fat.length).toBe(80000);
	expect([a, b]).toHaveLength(2);
	expect(__STATS__.hints).toHaveLength(0);
});
