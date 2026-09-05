import main from "abc";
import deep from "scope/def/hello/other/world";

export function test() {
	expect(main).toBe("abc .");
	expect(deep).toBe("def ./hello/other/world");
}
