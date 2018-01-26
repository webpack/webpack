import "./module";

expect(function() {
	module.exports = 1;
}).toThrowError();

expect((typeof module.exports)).toBe("undefined");

expect((typeof define)).toBe("undefined");
expect(function() {
	define(function() {})
}).toThrowError(/define is not defined/);

export default 1234;

if(eval("typeof exports !== \"undefined\"")) {
	// exports is node.js exports and not webpacks
	expect(Object.keys(exports)).toEqual([]);
}
