import abc from "abc/hello-world";
import main from "abc";
import def, { module } from "def/hello-world";
import def2, { module as module2 } from "def/hello/other/world";

export function test() {
	expect(abc).toBe("abc ./hello-world");
	expect(main).toBe("abc .");
	expect(def).toBe("def");
	expect(def2).toBe("def");
	expect(module).toBe("./hello-world");
	expect(module2).toBe("./hello/other/world");
}
