it("should provide a module for a simple free var", function() {
	aaa.should.be.eql("aaa");
});

it("should provide a module for a nested var", function() {
	(bbb.ccc).should.be.eql("bbbccc");
	var x = bbb.ccc;
	x.should.be.eql("bbbccc");
});

it("should provide a module for a nested var within a IIFE", function() {
	(function(process) {
		(process.env.NODE_ENV).should.be.eql("development");
		var x = process.env.NODE_ENV;
		x.should.be.eql("development");
	}(process));
});

it("should not provide a module for a part of a var", function() {
	(typeof bbb).should.be.eql("undefined");
});

it("should provide a module for a property request", function() {
	(dddeeefff).should.be.eql("fff");
	var x = dddeeefff;
	x.should.be.eql("fff");
});

it("should provide ES2015 modules", function() {
	(es2015.default).should.be.eql("ECMAScript 2015");
	(es2015.alias).should.be.eql("ECMAScript Harmony");
	(es2015.year).should.be.eql(2015);
	(es2015_name).should.be.eql("ECMAScript 2015");
	(es2015_alias).should.be.eql("ECMAScript Harmony");
	(es2015_year).should.be.eql(2015);
});
