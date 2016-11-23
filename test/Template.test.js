var should = require("should");
var path = require("path");

var template = require("../lib/Template");

describe("Template", function() {
	it("should generate valid identifiers", function() {
		template.toIdentifier("0abc-def9").should.equal("_abc_def9");
	});
	it("should generate valid number identifiers", function() {
		var items = [];
		var item;
		for(var i = 0; i < 80; i += 1) {
			item = template.numberToIdentifer(i);
			if(item === '') {
				throw new Error('empty number identifier');
			} else if(items.indexOf(item) > -1) {
				throw new Error('duplicate number identifier');
			} else {
				items.push(item);
			}
		}
	});
});
