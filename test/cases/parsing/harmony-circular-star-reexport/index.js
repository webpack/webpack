import * as all from "./c";

it("should contain all exports", () => {
	expect(all).toEqual(
		nsObj({
			a: "a",
			b: "b",
			c: "c"
		})
	);
});
