var should = require("should");

var Parser = require("../lib/Parser");
var CommonJsRequireDependencyParserPlugin = require("../lib/dependencies/CommonJsRequireDependencyParserPlugin");
var CommonJsRequireDependency = require("../lib/dependencies/CommonJsRequireDependency");

describe("RequireDependencyParserPlugin", function() {

	it("should parse out dependencies", function() {
		var parser = new Parser();
		
		new CommonJsRequireDependencyParserPlugin().apply(parser);
		
		var result = parser.parse(
			"var mod = require('module');\n" +
			"try {if(!false) { for(;;) { alert(require('./file')); }}} catch(e) {}",
			{
				current: {
					addDependency: function(d) {
						this.dependencies.push(d);
					},
					dependencies: []
				}
			}
		);
		result.should.have.property("current").have.property("dependencies");
		var deps = result.current.dependencies;
		deps.length.should.be.eql(2);
		deps[0].should.be.instanceOf(CommonJsRequireDependency);
		deps[0].request.should.be.eql("module");
		deps[0].loc.start.line.should.be.eql(1);
		deps[0].optional.should.be.eql(false);
		deps[1].should.be.instanceOf(CommonJsRequireDependency);
		deps[1].request.should.be.eql("./file");
		deps[1].loc.start.line.should.be.eql(2);
		deps[1].optional.should.be.eql(true);
	});

});
