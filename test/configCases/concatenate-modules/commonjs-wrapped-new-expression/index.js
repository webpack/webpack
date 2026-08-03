// the require() wraps "consumer", and wrapping propagates to "classes", so the
// class bindings resolve through a wrapper accessor call
import { tag } from "./member";

it("should construct a class reached through a wrapper accessor", () => {
	expect(tag).toBe("member");
	expect(require("./consumer").tags).toEqual(["klass", "factory"]);
});
