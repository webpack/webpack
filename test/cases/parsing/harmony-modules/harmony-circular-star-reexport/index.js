import * as all from "./c";

it("harmony-circular-star-reexport: should contain all exports", () => {
	expect(all).toEqual(
		nsObj({
			a: "a",
			b: "b",
			c: "c"
		})
	);
});
