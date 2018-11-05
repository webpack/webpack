it("should provide a module for a simple free var", function() {
	expect(aaa).toBe("aaa");
});

it("should provide a module for a nested var", function() {
	expect((bbb.ccc)).toBe("bbbccc");
	var x = bbb.ccc;
	expect(x).toBe("bbbccc");
});

it("should provide a module for a nested var within a IIFE's argument", function() {
	(function(process) {
		expect((process.env.NODE_ENV)).toBe("development");
		var x = process.env.NODE_ENV;
		expect(x).toBe("development");
	}(process));
});

it("should provide a module for thisExpression", () => {
	expect(this.aaa).toBe("aaa");
});

it("should provide a module for a nested var within a IIFE's this", function() {
	(function() {
		expect((this.env.NODE_ENV)).toBe("development");
		var x = this.env.NODE_ENV;
		expect(x).toBe("development");
	}.call(process));
});

it("should provide a module for a nested var within a nested IIFE's this", function() {
	(function() {
		(function() {
			expect((this.env.NODE_ENV)).toBe("development");
			var x = this.env.NODE_ENV;
			expect(x).toBe("development");
		}.call(this));
	}.call(process));
});

it("should not provide a module for a part of a var", function() {
	expect((typeof bbb)).toBe("undefined");
});

it("should provide a module for a property request", function() {
	expect((dddeeefff)).toBe("fff");
	var x = dddeeefff;
	expect(x).toBe("fff");
});

it("should provide ES2015 modules", function() {
	expect((es2015.default)).toBe("ECMAScript 2015");
	expect((es2015.alias)).toBe("ECMAScript Harmony");
	expect((es2015.year)).toBe(2015);
	expect((es2015_name)).toBe("ECMAScript 2015");
	expect((es2015_alias)).toBe("ECMAScript Harmony");
	expect((es2015_year)).toBe(2015);
});

it("should not provide for mjs", function(){
	var foo = require("./foo.mjs").default;
	expect(foo()).toBe("esm");
});
