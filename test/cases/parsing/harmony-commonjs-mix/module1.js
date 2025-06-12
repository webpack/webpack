import "./module";

expect(function() {
	module.exports = 1;
}).toThrow();

expect((typeof module.exports)).toBe("undefined");

expect((typeof define)).toBe("undefined");
expect(function() {
	define(function() {})
}).toThrow(/define is not defined/);

export default 1234;

if(eval("typeof exports !== \"undefined\"")) {
	// exports is node.js exports and not webpack's
	expect(Object.keys(exports)).toEqual([]);
}
