import { name as and } from "./and";
import { name as or } from "./or";
import { name as nullish } from "./nullish";
import { name as member } from "./member";

it("should use the value taken for a logical assignment of `module.exports = require()`", () => {
	expect(global.conditionalReexportFlag).toBe(undefined);
	expect(and).toBe("b");
	expect(or).toBe("b");
	expect(nullish).toBe("b");
	expect(member).toBe("b");
});
