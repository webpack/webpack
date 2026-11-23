import { z } from "lib";

it("should keep a namespace re-export binding distinct from a same-named sibling export *", () => {
	expect(z.coerce.number()).toBe("coerce.number");
});
