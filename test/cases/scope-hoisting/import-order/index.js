import "./commonjs";
import "./module";
import { log } from "./tracker";

it("should evaluate import in the correct order", function() {
	log.should.be.eql(["commonjs", "module"]);
});
