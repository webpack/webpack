import obj from "./cjs";
// prettier-ignore
obj.flag = true
import { value } from "./module";
import { value as value2 } from "./iife";
import { value as value3 } from "./module?2";
obj.flag = true;

it("should not break on ASI-code", () => {
	expect(obj.flag).toBe(true);
	expect(value).toBe(true);
	expect(value2).toBe(true);
	expect(value3).toBe(true);
});
