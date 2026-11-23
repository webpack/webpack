import { coerce, number, z } from "lib";

it("should read a member through `export * as` beside a same-named `export *`", () => {
	expect(z.coerce.number()).toBe("coerce.number");
	expect(z.number()).toBe("schemas.number");
	expect(coerce.number()).toBe("coerce.number");
	expect(number()).toBe("schemas.number");
});
