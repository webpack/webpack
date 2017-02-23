import b from "./b";

it("should parse dynamic property names", function() {
	var o = {
		[require("./a")]: "a",
		[b]: "b"
	};
	o.should.be.eql({
		a: "a",
		b: "b"
	});
});

it("should match dynamic property names", function() {
	const {
		[require("./a")]: aa,
		[b]: bb
	} = { a: "a", b: "b" };
	const [x,, ...[{
		[b]: {
			[b]: cc
		}
	}]] = [0, 1, {b: {b: "c"}}];
	aa.should.be.eql("a");
	bb.should.be.eql("b");
	cc.should.be.eql("c");
});
