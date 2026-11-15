import data from "./data.json";
import nested from "./nested.json";

it("should keep a used __proto__ key when unused keys are dropped", () => {
	expect(data.b.big).toBe(3);
	expect(Object.prototype.hasOwnProperty.call(data, "__proto__")).toBe(true);
	expect(data["__proto__"]).toEqual({ x: 1 });
	expect(data["__proto__"].x).toBe(1);
});

it("should keep a nested used __proto__ key when unused keys are dropped", () => {
	expect(Object.prototype.hasOwnProperty.call(nested.outer, "__proto__")).toBe(
		true
	);
	expect(nested.outer["__proto__"].y).toBe(2);
});
