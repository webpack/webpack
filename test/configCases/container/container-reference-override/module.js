import abc from "abc/hello-world";
import other from "abc/other";

export function test() {
	expect(abc).toBe("ok ./hello-world");
	expect(other).toBe("ok ./other");
}
