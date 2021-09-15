import x from "./a";

const sum1 = (x, y, total = x + y) => total;
const id1 = (a = x) => a;

function sum2(x, y, total = x + y) { return total; }
function id2(a = x) { return a; }

const sum3 = function(x, y, total = x + y) { return total; }
const id3 = function(a = x) { return a; }

it("should shadow imported bindings", () => {
	// Arrow functions
	expect(sum1(2, 3)).toBe(5);
	expect(id1(1)).toBe(1);
	expect(id1()).toBe(9);

	// Function declarations
	expect(sum2(2, 3)).toBe(5);
	expect(id2(1)).toBe(1);
	expect(id2()).toBe(9);

	// Function expressions
	expect(sum3(2, 3)).toBe(5);
	expect(id3(1)).toBe(1);
	expect(id3()).toBe(9);
});
