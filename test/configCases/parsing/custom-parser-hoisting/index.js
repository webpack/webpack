import { alias, reexported } from "./barrel";

const hoisting = require("./hoisting");
const blockDeclarations = require("./block-declarations");

it("should hoist from every position with a custom parser", () => {
	expect(hoisting).toEqual({
		block: "block",
		ifConsequent: "ifConsequent",
		ifAlternate: "ifAlternate",
		forInit: "forInit",
		forBody: "forBody",
		forInLeft: "forInLeft",
		forOfBody: "forOfBody",
		forOfLeft: "forOfLeft",
		while: "while",
		doWhile: "doWhile",
		labeled: "labeled",
		with: "with",
		try: "try",
		catch: "catch",
		finally: "finally",
		switchCase: "switchCase",
		functionDeclaration: "functionDeclaration",
		blockFunction: "blockFunction",
		className: "DeclaredClass"
	});
});

it("should bind every block position with a custom parser", () => {
	expect(blockDeclarations).toEqual({
		block: "block",
		ifConsequent: "ifConsequent",
		ifAlternate: "ifAlternate",
		forBody: "forBody",
		forInBody: "forInBody",
		forOfBody: "forOfBody",
		whileBody: "whileBody",
		doWhileBody: "doWhileBody",
		labeled: "labeled",
		try: "try",
		catch: "catch",
		finally: "finally",
		switchConsequentBlock: "switchConsequentBlock",
		switchCase: "switchCase",
		classDeclaration: "classDeclaration"
	});
});

it("should read imports and re-exports with a custom parser", () => {
	expect(alias).toBe("named");
	expect(reexported).toBe("reexported");
});
