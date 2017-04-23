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

	expect(x.a).toEqual("a");
	expect(x.func()).toEqual("b");
	expect(x.c()).toEqual("c");
});

it("should parse spread operator"/*, function() {
	expect([0, ...require("./array")]).toEqual([0, 1, 2, 3]);
	({z: expect(0, ...require("./object")})).toEqual({z: 0, a: 1, b: 2, c: 3});
}*/);

it("should parse arrow function", function() {
	(() => expect(require("./a"))()).toEqual("a");
	(() => {
		return require("./a");
	expect(})()).toEqual("a");
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
	expect(x).toEqual("abc");
	expect(y).toEqual("b");
})

it("should parse generators and yield", function() {
	function* gen() {
		yield require("./a");
		yield require("./b");
	}
	var x = gen();
	expect(x.next().value).toEqual("a");
	expect(x.next().value).toEqual("b");
	expect(x.next().done).toEqual(true);
})
