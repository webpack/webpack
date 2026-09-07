import { Base, Untouched } from "./exports";

const extend = (fn) => class Base extends fn(Base) {};
const selfExtend = () => class Untouched extends Object {};

it("should not capture a heritage reference with the class' own name", () => {
	expect(new (extend((x) => x))()).toBeInstanceOf(Base);
});

it("should read the import where no class shadows the name", () => {
	expect(Untouched).toBe("untouched");
	expect(typeof selfExtend()).toBe("function");
});
