import {
	afterReturn,
	computedMember,
	conditionalOperand,
	forOfSubject,
	inTemplate,
	optionalChain,
	renamedDestructure,
	spreadArgument,
	statementStart,
	tagged,
	typeofResult,
	voidResult
} from "./consumer";

it("should substitute a require() in return and template positions", () => {
	expect(afterReturn()).toBe("value");
	expect(inTemplate()).toBe("value!");
});

it("should substitute a require() used as a template tag", () => {
	expect(tagged()).toBe("tagged:literal:");
});

it("should substitute a require() read with a computed member", () => {
	expect(computedMember()).toBe("value");
});

it("should substitute a require() behind optional chaining", () => {
	expect(optionalChain()).toBe("value");
});

it("should substitute a require() spread into a call", () => {
	expect(spreadArgument()).toBe(3);
});

it("should substitute a require() as the subject of for...of", () => {
	expect(forOfSubject()).toEqual([1, 2, 3]);
});

it("should substitute a require() under void and typeof", () => {
	expect(voidResult()).toBe(undefined);
	expect(typeofResult()).toBe("object");
});

it("should substitute both operands of a conditional", () => {
	expect(conditionalOperand(true)).toBe("value");
	expect(conditionalOperand(false)).toBe("other");
});

it("should substitute a require() destructured with a rename and a default", () => {
	expect(renamedDestructure()).toEqual(["value", "fallback"]);
});

it("should substitute a require() opening a statement", () => {
	expect(statementStart()).toEqual(["before"]);
});
