const should = require("should");
const FakeDocument = require("../../../helpers/FakeDocument");

let oldNonce;
let oldPublicPath;

beforeEach(() => {
	oldNonce = __webpack_nonce__;
	oldPublicPath = __webpack_public_path__;
	global.document = new FakeDocument();
	global.location = {origin: "https://example.com"};
});

afterEach(() => {
	delete global.document;
	delete global.location;
	__webpack_nonce__ = oldNonce;
	__webpack_public_path__ = oldPublicPath;
})

it("should prefetch and preload child chunks on chunk load", () => {
	__webpack_nonce__ = "nonce";
	__webpack_public_path__ = "/public/path/";

	const promise = import(/* webpackChunkName: "chunk1" */ "./chunk1");
	document.head._children.length.should.be.eql(2);
	const script = document.head._children[0];
	script._type.should.be.eql("script");
	should(script.src).be.eql("/public/path/chunk1.js")
	should(script.getAttribute("nonce")).be.eql("nonce")
	should(script.crossOrigin).be.eql("anonymous");
	should(script.onload).be.type("function");

	let link = document.head._children[1];
	link._type.should.be.eql("link");
	should(link.rel).be.eql("preload");
	should(link.as).be.eql("script");
	should(link.href).be.eql("/public/path/chunk1-b.js");
	should(link.charset).be.eql("utf-8");
	should(link.getAttribute("nonce")).be.eql("nonce");
	should(link.crossOrigin).be.eql("anonymous");

	__non_webpack_require__("./chunk1.js");
	script.onload();

	return promise.then((ex) => {
		document.head._children.length.should.be.eql(4);

		let link = document.head._children[2];
		link._type.should.be.eql("link");
		should(link.rel).be.eql("prefetch");
		should(link.href).be.eql("/public/path/chunk1-c.js");

		link = document.head._children[3];
		link._type.should.be.eql("link");
		should(link.rel).be.eql("prefetch");
		should(link.href).be.eql("/public/path/chunk1-a.js");
	});
})
