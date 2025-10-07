import defer * as mod1 from "./file.ext" with { type: "bytes" };
import defer * as mod2 from "./file.ext" with { type: "json" };
import * as mod3 from "./file.ext" with { type: "bytes" };
import * as mod4 from "./file.ext" with { type: "json" };

it("should work with defer and import attributes", () => {
	const decoder = new TextDecoder('utf-8');
	const mod1Decoded = JSON.parse(decoder.decode(mod1.default));
	expect(mod1Decoded.foo).toBe("bar");
	expect(mod1Decoded.nested.foo).toBe("bar");
	expect(mod2.default.foo).toBe("bar");
	expect(mod2.default.nested.foo).toBe("bar");
	const mod2Decoded = JSON.parse(decoder.decode(mod3.default));
	expect(mod2Decoded.foo).toBe("bar");
	expect(mod2Decoded.nested.foo).toBe("bar");
	expect(mod4.default.foo).toBe("bar");
	expect(mod4.default.nested.foo).toBe("bar");
});
