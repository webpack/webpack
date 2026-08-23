import big from "./big";
import tiny from "./tiny";

it("should stay quiet for a chunk too small to matter", () => {
	expect(big.length).toBe(3000);
	expect(tiny).toBe(1);
});
