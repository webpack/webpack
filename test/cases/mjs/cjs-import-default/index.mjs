import { data } from "./cjs.js";
import * as star from "./cjs.js";
import def from "./cjs.js";
import { ns, default as def1, def as def2, data as data2 } from "./reexport.mjs";
import * as reexport from "./reexport.mjs";

it("should get correct values when importing named exports from a CommonJs module from mjs", function() {
	expect(typeof data).toBe("undefined");
	expect({ data }).toEqual({ data: undefined });
	expect(def).toEqual({
		data: "ok",
		default: "default"
	});
	expect({ def }).toEqual({
		def: {
			data: "ok",
			default: "default"
		}
	});
	expect(star).toEqual({
		default: {
			data: "ok",
			default: "default"
		},
		[Symbol.toStringTag]: "Module"
	});
	expect({ star }).toEqual({
		star: {
			default: {
				data: "ok",
				default: "default"
			},
			[Symbol.toStringTag]: "Module"
		}
	});
	expect(star.default).toEqual({
		data: "ok",
		default: "default"
	});
	expect(ns).toEqual({
		default: {
			data: "ok",
			default: "default"
		},
		[Symbol.toStringTag]: "Module"
	});
	expect(def1).toEqual({
		data: "ok",
		default: "default"
	});
	expect(def2).toEqual({
		data: "ok",
		default: "default"
	});
	expect((typeof data2)).toBe("undefined");
	expect(reexport).toEqual({
		ns: {
			default: {
				data: "ok",
				default: "default"
			},
			[Symbol.toStringTag]: "Module"
		},
		default: {
			data: "ok",
			default: "default"
		},
		def: {
			data: "ok",
			default: "default"
		},
		data: undefined,
		[Symbol.toStringTag]: "Module"
	});
});
