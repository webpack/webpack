import abc from "abc/system-hello-world";
import def, { module } from "def/system-hello-world";
import def2, { module as module2 } from "def/system-hello/other/world";

export function test() {
	expect(abc).toBe("abc system-hello-world");
	expect(def).toBe("def");
	expect(def2).toBe("def");
	expect(module).toBe("system-hello-world");
	expect(module2).toBe("system-hello/other/world");
}
