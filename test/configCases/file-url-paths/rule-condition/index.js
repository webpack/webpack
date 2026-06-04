import a from "./included/a";
import b from "./b";

it("rule condition include accepts a file URL instance", () => {
	// the loader only runs for files inside the included directory
	expect(a).toBe("loaded");
	expect(b).toBe("b");
});
