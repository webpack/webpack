import abc from "abc/system-hello-world";
import def, { module } from "def/system-hello-world";
import def2, { module as module2 } from "def/system-hello/other/world";
import other from "other/other";
import otherSelf from "other/self";
import self from "self/self";
import selfOther from "self/other";

export function test() {
	expect(abc).toBe("abc ./system-hello-world");
	expect(def).toBe("def");
	expect(def2).toBe("def");
	expect(module).toBe("./system-hello-world");
	expect(module2).toBe("./system-hello/other/world");
	expect(other).toBe("other and dep");
	expect(otherSelf).toBe("self and dep");
	expect(self).toBe("self and dep");
	expect(selfOther).toBe("other and dep");
}
