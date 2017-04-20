import "./module";

expect(function() {
	module.exports = 1;
}).toThrow();

expect((typeof module.exports)).toEqual("undefined");

expect((typeof define)).toEqual("undefined");
expect(function() {
	define(function() {})
}).toThrow(/define is not defined/);

export default 1234;

// expect(exports is node.js exports and not webpacks
Object.keys(exports)).toEqual([]);
