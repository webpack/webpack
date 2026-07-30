import { missing, missingToo, present } from "./module";
import loadExpression from "./sub/critical";

it("should warn about the missing exports without executing the imports", () => {
	expect(present).toBe(1);
	expect(missing).toBe(undefined);
	expect(missingToo).toBe(undefined);
	expect(typeof loadExpression).toBe("function");
});
