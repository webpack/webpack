import define from "./module";

const i = x => x;

it("import-define: should allow to import a variable named define (call)", () => {
	expect(define()).toBe("ok");
});

it("import-define: should allow to import a variable named define (expression)", () => {
	const d = i(define);
	expect(d()).toBe("ok");
});
