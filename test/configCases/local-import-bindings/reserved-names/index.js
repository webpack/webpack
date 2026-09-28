import { value as __webpackReserved, other as café } from "./exports";

const resolve = (name) => eval(name);

it("leaves a name webpack reserves for itself alone", () => {
	expect(() => resolve("__webpackReserved")).toThrow(ReferenceError);
	expect(__webpackReserved).toBe("value");
});

it("leaves a name it cannot spell back alone", () => {
	expect(() => resolve("café")).toThrow(ReferenceError);
	expect(café).toBe("other");
});
