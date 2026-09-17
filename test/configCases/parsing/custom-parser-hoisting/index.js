import { alias, reexported } from "./barrel";

const hoisting = require("./hoisting");

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

it("should read imports and re-exports with a custom parser", () => {
	expect(alias).toBe("named");
	expect(reexported).toBe("reexported");
});
