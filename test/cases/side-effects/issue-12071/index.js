require("./module");
require("./reexport");

import { value } from "./reexport2";
const { value: value2, own } = require("./reexport2");

it("should not crash", () => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
	expect(own).toBe(42);
});
