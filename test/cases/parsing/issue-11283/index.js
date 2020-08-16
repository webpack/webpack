import A from "./A.js";

function magicA() {
	// To be sure that future optimization
	// will not affect test suite
	return String.fromCharCode(65);
}

it("should parse switch case properly", () => {
	switch (1) {
		case 2:
		case 1:
			const A = magicA();
			expect(A).toBe("A");
			break;
	}

	switch (1) {
		case 2:
		case 1: {
			const A = magicA();
			expect(A).toBe("A");
			break;
		}
	}
});

it("should share block scope for several cases", () => {
	switch (1) {
		case 1:
			const A = magicA();
		case 2:
			expect(A).toBe("A");
			break;
	}
});
