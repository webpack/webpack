import define from "./module";

const i = x => x;

it("should allow to import a variable named define (call)", () => {
	expect(define()).toBe("ok");
});

it("should allow to import a variable named define (expresion)", () => {
	const d = i(define);
	expect(d()).toBe("ok");
});
