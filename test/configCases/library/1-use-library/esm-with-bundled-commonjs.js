import library from "library";

it(
	"should be able to import harmony exports from library (" + NAME + ")",
	function () {
		expect(new library().getNumber()).toBe(1);
	}
);