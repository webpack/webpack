import fs from "fs";

const log: string[] = [];

// each skipped declaration is followed by a line that would otherwise call
// or index the value before it, once the types are blanked
let first = "first"
interface Shape {
	size: number;
}
(function () {
	log.push("call");
})()

let second = "second"
type Alias = number
[1, 2].forEach((n: number) => log.push(String(n)))

let third = "third" as string
(function () {
	log.push("after as");
})()

// a line break between `)` and the return type
const next = (value: number)
	: number => value + 1;

if (first) type InBranch = 1;

it("runs the code the types were skipped from", () => {
	expect([first, second, third]).toEqual(["first", "second", "third"]);
	expect(log).toEqual(["call", "1", "2", "after as"]);
	expect(next(1)).toBe(2);
});

it("blanks the types in the emitted code, keeping every line", () => {
	const code = fs.readFileSync(__filename, "utf8");
	// built from parts, as this test's own text is in the bundle too
	expect(code).not.toContain(["interface", "Shape"].join(" "));
	expect(code).not.toContain(["type", "Alias"].join(" "));
	expect(code).not.toContain(['"third"', "as", "string"].join(" "));
	expect(code).toContain(['let first = "first"', ";"].join("\n"));
});
