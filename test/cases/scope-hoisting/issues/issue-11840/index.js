import { Mixin } from "./Mixin";

const createMixin = fn => class Mixin extends fn(Mixin) {};

it("issue-11840: should have no name conflict", () => {
	expect(new (createMixin(x => x))()).toBeInstanceOf(Mixin);
});
