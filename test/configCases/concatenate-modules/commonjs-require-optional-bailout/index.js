import { tag } from "./member";
import { load } from "./loader-module";

it("should keep a throwing optional require() catchable at its call site", () => {
	expect(tag).toBe("member");
	expect(load()).toBe("fallback");
});
