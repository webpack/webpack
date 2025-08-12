import lib1 from "lib1";
import lib2 from "lib2";
import lib3 from "lib3";
import lib4 from "lib4";
import lib5 from "lib5";


it(
	"should be able to import harmony exports from library (" + NAME + ")",
	function () {
		expect(new lib1().getNumber()).toBe(1);
		expect(lib2).toMatchObject({});
		expect(lib3.name).toBe("overrides-exports-cjs");
		expect(lib3.foo).toBe(undefined);
		expect(lib4).toMatchObject({});
		expect(lib5).toMatchObject({});
	}
);
