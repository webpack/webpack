import { missing, present } from "./module";
import loadExpression from "./sub/critical";

it("should warn about the missing export without executing the import", () => {
	expect(present).toBe(1);
	expect(missing).toBe(undefined);
	expect(typeof loadExpression).toBe("function");
});
