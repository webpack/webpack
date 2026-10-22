import { value as value1 } from "./module1";

const value2 = require("./module2");
const value3 = require("./module3");
const value4 = require("./module4");

let value = 42;
let other = 43;

it("keeps the inlined entry's declarations apart from the modules' global reads", () => {
	expect(value1).toBe(undefined);
	expect(value).toBe(42);
	expect(other).toBe(43);
	// module2 reads `value` at step 0 and `other` at step 1
	expect(value2).toBe("undefined");
	// module3 reads `value` throughout; at step 1 only its cached free names say so
	expect(value3).toBe("undefined");
	expect(value4).toBe("function");
});
