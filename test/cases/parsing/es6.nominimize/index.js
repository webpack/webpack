"use strict";

import a from "./a";

it("should parse classes", function() {
	class MyClass {
		constructor() {
			this.a = require("./a");
		}

		func() {
			return require("./b");
		}

		[require("./c")]() {
			return "c";
		}
	}

	var x = new MyClass();

	x.a.should.be.eql("a");
	x.func().should.be.eql("b");
	x.c().should.be.eql("c");
});

it("should parse spread operator"/*, function() {
	[0, ...require("./array")].should.be.eql([0, 1, 2, 3]);
	({z: 0, ...require("./object")}).should.be.eql({z: 0, a: 1, b: 2, c: 3});
}*/);

it("should parse arrow function", function() {
	(() => require("./a"))().should.be.eql("a");
	(() => {
		return require("./a");
	})().should.be.eql("a");
	require.ensure([], () => {
		require("./a");
	});
	require.ensure([], () => {
		require("./async");
	});
	if(module.hot) {
		module.hot.accept("./a", () => {
			var x = 1;
		});
	}
});

it("should parse template literals", function() {
	function tag(strings, value) {
		return value;
	}
	var x = `a${require("./b")}c`;
	var y = tag`a${require("./b")}c`;
	x.should.be.eql("abc");
	y.should.be.eql("b");
})

it("should parse generators and yield", function() {
	function* gen() {
		yield require("./a");
		yield require("./b");
	}
	var x = gen();
	x.next().value.should.be.eql("a");
	x.next().value.should.be.eql("b");
	x.next().done.should.be.eql(true);
})
