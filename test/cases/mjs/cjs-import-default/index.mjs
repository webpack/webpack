import { data } from "./cjs.js";
import * as star from "./cjs.js";
import def from "./cjs.js";
import { ns, default as def1, def as def2, data as data2 } from "./reexport.mjs";
import * as reexport from "./reexport.mjs";

it("should get correct values when importing named exports from a CommonJs module from mjs", function() {
	(typeof data).should.be.eql("undefined");
	({ data }).should.be.eql({ data: undefined });
	def.should.be.eql({
		data: "ok",
		default: "default"
	});
	({ def }).should.be.eql({
		def: {
			data: "ok",
			default: "default"
		}
	});
	const valueOf = "valueOf";
	star[valueOf]().should.be.eql({
		default: {
			data: "ok",
			default: "default"
		}
	});
	({ star }).should.be.eql({
		star: {
			default: {
				data: "ok",
				default: "default"
			}
		}
	});
	star.default.should.be.eql({
		data: "ok",
		default: "default"
	});
	ns.should.be.eql({
		default: {
			data: "ok",
			default: "default"
		}
	});
	def1.should.be.eql({
		data: "ok",
		default: "default"
	});
	def2.should.be.eql({
		data: "ok",
		default: "default"
	});
	(typeof data2).should.be.eql("undefined");
	reexport[valueOf]().should.be.eql({
		ns: {
			default: {
				data: "ok",
				default: "default"
			}
		},
		default: {
			data: "ok",
			default: "default"
		},
		def: {
			data: "ok",
			default: "default"
		},
		data: undefined
	});
});
