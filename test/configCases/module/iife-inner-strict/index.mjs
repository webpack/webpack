import foo from  './foo.cjs';

let answer

try {
    delete Object.prototype; // will throw error in strict mode
		answer = 'no';
	} catch {
		answer = 'yes';
}

it("multiple inlined modules should be wrapped in IIFE to isolate from other inlined modules and chunk modules", () => {
	expect(answer).toBe("yes"); // the code should throw in strict mode
});
