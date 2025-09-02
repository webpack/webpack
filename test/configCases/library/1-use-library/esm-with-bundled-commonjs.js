// class-commonjs
import lib1 from "lib1";
// exports-shortcut-cjs
import lib2 from "lib2";
// overrides-exports-cjs
import lib3 from "lib3";
// self-reference-cjs
import lib4 from "lib4";
// adding-exports-cjs
import lib5 from "lib5";
// define-module-property-cjs
import lib6, { name as lib6_name, foo as lib6_foo } from "lib6";
// reexport-define-module-property-cjs
import lib7, { name as lib7_name, foo as lib7_foo } from "lib7";
// define-this-exports-cjs
import lib8, { foo as lib8_foo, name as lib8_name } from "lib8";

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

		expect(lib6).toMatchObject({
			foo: "foo",
			name: "define-module-property-cjs"
		});
		expect(lib6_name).toBe("define-module-property-cjs");
		expect(lib6_foo).toBe("foo");

		expect(lib7).toMatchObject({
			foo: "foo",
			name: "reexport-define-module-property-cjs"
		});
		expect(lib7_name).toBe("reexport-define-module-property-cjs");
		expect(lib7_foo).toBe("foo");

		expect(lib8).toMatchObject({
			foo: "foo",
			name: "define-this-exports-cjs"
		});
		expect(lib8_foo).toBe("foo");
		expect(lib8_name).toBe("define-this-exports-cjs");
	}
);
