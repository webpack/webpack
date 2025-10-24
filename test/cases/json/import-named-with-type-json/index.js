import { aa } from "../data/e.json" with { type: "json" };
import { named } from '../data/f.json' with { type: "json" };

it("should not allow named import with import assertion", function () {
	expect(aa).toEqual(undefined);
	expect(named).toEqual(undefined);
});
