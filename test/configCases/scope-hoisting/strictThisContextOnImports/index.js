import value, { identity } from "./module";
import * as m from "./module";

it("should parse and translate identifiers correctly", function() {
	expect(identity(value)).toBe(1234);
	expect(m.identity(value)).toBe(1234);
	expect(m.identity(identity)).toBe(identity);
	expect(m.identity(m.identity)).toBe(m.identity);
	expect(identity(m.identity)).toBe(m.identity);
	expect(identity(m.default)).toBe(1234);
});
