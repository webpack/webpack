import value, { identity } from "./module";
import * as m from "./module";

it("should parse and translate identifiers correctly", function() {
	identity(value).should.be.eql(1234);
	m.identity(value).should.be.eql(1234);
	m.identity(identity).should.be.eql(identity);
	m.identity(m.identity).should.be.eql(m.identity);
	identity(m.identity).should.be.eql(m.identity);
	identity(m.default).should.be.eql(1234);
});
