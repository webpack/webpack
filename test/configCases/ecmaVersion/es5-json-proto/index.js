import short from "./short.json";
import nested from "./nested.json";
import plain from "./plain.json";

var hasOwn = function (object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
};

it("should keep a short JSON __proto__ key as an own property", function () {
	expect(hasOwn(short, "__proto__")).toBe(true);
	expect(short["__proto__"]).toBe(1);
});

it("should keep a nested JSON __proto__ key as an own property", function () {
	expect(hasOwn(nested.outer, "__proto__")).toBe(true);
	expect(nested.outer["__proto__"].flag).toBe(true);
	expect(nested.outer.other).toBe(1);
});

it("should keep JSON without a __proto__ key unchanged", function () {
	expect(plain.a).toBe(1);
});
