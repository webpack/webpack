import lib1 from "lib1";
import lib2 from "lib2";
import lib3 from "lib3";
import lib4 from "lib4";
import lib5 from "lib5";
import lib6, { foo as lib6_foo, name as lib6_name } from "lib6";

it(
	"should be able to import harmony exports from library (" + NAME + ")",
	function () {
		expect(new lib1().getNumber()).toBe(1);
		expect(lib2).toEqual({});
		expect(lib3.name).toBe("overrides-exports-cjs");
		expect(lib3.foo).toBe(undefined);
		expect(lib4).toEqual({});
		expect(lib5.name).toBe("adding-exports-cjs");
		expect(lib5.foo).toBe("foo");

		expect(lib6_foo).toBe("foo");
		expect(lib6_name).toBe("define-this-exports-cjs");
	}
);
