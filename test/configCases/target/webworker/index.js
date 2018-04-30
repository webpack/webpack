var should = require("should");
// shimming global window object so the http-module is happy.
// window is assigned without var on purpose.
global.XMLHttpRequest = function() {};
global.XMLHttpRequest.prototype.open = function() {};

it("should provide a global Buffer constructor", function() {
	Buffer.should.be.a.Function();
});

it("should provide a global console shim", function () {
	console.should.be.an.Object();
	console.time.should.be.a.Function();
});

it("should provide a global process shim", function () {
	process.should.be.an.Object();
});

it("should provide a global setImmediate shim", function () {
	setImmediate.should.be.a.Function();
});

it("should provide a global clearImmediate shim", function () {
	clearImmediate.should.be.a.Function();
});

it("should provide an assert shim", function () {
	require("assert").should.be.a.Function();
});

it("should provide a util shim", function () {
	require("util").should.be.an.Object();
});

it("should provide a buffer shim", function () {
	require("buffer").should.be.an.Object();
});

it("should provide a crypto shim", function () {
	require("crypto").should.be.an.Object();
});

it("should provide a domain shim", function () {
	require("domain").should.be.an.Object();
});

it("should provide an events shim", function () {
	require("events").should.be.a.Function();
});

it("should provide an http shim", function () {
	require("http").should.be.an.Object();
});

it("should provide an https shim", function () {
	require("https").should.be.an.Object();
});

it("should provide an os shim", function () {
	require("os").should.be.an.Object();
});

it("should provide a path shim", function () {
	require("path").should.be.an.Object();
});

it("should provide a punycode shim", function () {
	require("punycode").should.be.an.Object();
});

it("should provide a stream shim", function () {
	require("stream").should.be.a.Function();
});

it("should provide a tty shim", function () {
	require("tty").should.be.an.Object();
});

it("should provide a url shim", function () {
	require("url").should.be.an.Object();
});

it("should provide a util shim", function () {
	require("util").should.be.an.Object();
});

it("should provide a vm shim", function () {
	require("vm").should.be.an.Object();
});

it("should provide a zlib shim", function () {
	require("zlib").should.be.an.Object();
});

it("should provide a shim for a path in a build-in module", function () {
	require("process/in.js").should.be.eql("in process");
});
