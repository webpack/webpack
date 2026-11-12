import * as library from "./barrel";
const direct = require("./middle");

it("should recover after validating a retained reexport", () => {
	expect(direct).toBe(17);
	expect(library.value).toBe(23);
});
