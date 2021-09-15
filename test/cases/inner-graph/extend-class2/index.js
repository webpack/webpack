import {
	exportsInfoForA as declA,
	exportsInfoForB as declB,
	exportsInfoForC as declC,
	exportsInfoForD as declD,
	exportsInfoForE as declE,
	exportsInfoForF as declF
} from "./dep2?decl";
import {
	exportsInfoForA as exprA,
	exportsInfoForB as exprB,
	exportsInfoForC as exprC,
	exportsInfoForD as exprD,
	exportsInfoForE as exprE,
	exportsInfoForF as exprF
} from "./dep2?expr";

it("should load module correctly", () => {
	require("./module-decl");
	require("./module-expr");
});

it("A should be used", () => {
	expect(declA).toBe(true);
	expect(exprA).toBe(true);
});

if (process.env.NODE_ENV === "production") {
	it("B should not be used", () => {
		expect(declB).toBe(false);
		expect(exprB).toBe(false);
	});
}

it("C should be used", () => {
	expect(declC).toBe(true);
	expect(exprC).toBe(true);
});

if (process.env.NODE_ENV === "production") {
	it("D should not be used", () => {
		expect(declD).toBe(false);
		expect(exprD).toBe(false);
	});
}

it("E should be used", () => {
	expect(declE).toBe(true);
	expect(exprE).toBe(true);
});

it("F should be used", () => {
	// Note: it has side-effects and is not affected by usage of the class
	expect(declF).toBe(true);
	expect(exprF).toBe(true);
});
