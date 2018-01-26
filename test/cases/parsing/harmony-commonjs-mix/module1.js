import "./module";

(function() {
	module.exports = 1;
}).should.throw();

expect((typeof module.exports)).toBe("undefined");

expect((typeof define)).toBe("undefined");
(function() {
	define(function() {})
}).should.throw(/define is not defined/);

export default 1234;

if(eval("typeof exports !== \"undefined\"")) {
	// exports is node.js exports and not webpacks
	expect(Object.keys(exports)).toEqual([]);
}
