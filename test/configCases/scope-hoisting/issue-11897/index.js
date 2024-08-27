import obj from "./cjs";
// prettier-ignore
obj.flag = true
import { value } from "./module";
import { value as value2 } from "./iife";
import { value as value3 } from "./module?2";
import { value as value4 } from "./module2";
import { value as value5 } from "./module3";
import { value as value6 } from "./module4";
import { value as value7 } from "./module5";
obj.flag = true;

it("should not break on ASI-code", () => {
	expect(obj.flag).toBe(true);
	expect(value).toBe(true);
	expect(value2).toBe(true);
	expect(value3).toBe(true);
	expect(value4).toBe(true);
	expect(value5).toBe(true);
	expect(value6).toBe(true);
	expect(value7).toBe(true);
});
