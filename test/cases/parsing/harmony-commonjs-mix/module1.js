import "./module";

(function() {
	module.exports = 1;
}).should.throw();

(typeof module.exports).should.be.eql("undefined");

(typeof define).should.be.eql("undefined");
(function() {
	define(function() {})
}).should.throw(/define is not defined/);

export default 1234;

// exports is node.js exports and not webpacks
Object.keys(exports).should.be.eql([]);
