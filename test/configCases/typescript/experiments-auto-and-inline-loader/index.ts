import answer from "!!./identity-loader.js!./typed.ts";
import product from "!!./js-emitting-loader.js!./replaced.ts";

it("strips types after an inline loader under auto typescript", () => {
	expect(answer).toBe(42);
});

it("no-ops strip-types when an inline loader already emits plain JS", () => {
	expect(product).toBe(21);
});
