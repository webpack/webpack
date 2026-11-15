import keys from "./sub/keys.js";
import expected from "./sub/expected.js";

it("should list a directory changed while nothing watched it", () => {
	expect(keys).toEqual(expected);
});
