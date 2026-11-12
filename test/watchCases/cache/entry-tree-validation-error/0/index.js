import * as library from "./barrel";
const direct = require("./middle");

it("should recover from a failed descendant validation", () => {
	expect(direct).toBe(17);
	expect(library.value).toBe(23);
});
