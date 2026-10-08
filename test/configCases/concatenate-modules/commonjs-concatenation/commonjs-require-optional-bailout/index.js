import { tag } from "./member";
import { load } from "./loader-module";

it("commonjs-require-optional-bailout: should keep a throwing optional require() catchable at its call site", () => {
	expect(tag).toBe("member");
	expect(load()).toBe("fallback");
});
