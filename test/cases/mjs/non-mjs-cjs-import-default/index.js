import { data } from "./cjs.js";
import * as star from "./cjs.js";
import def from "./cjs.js";
import { ns, default as def1, def as def2, data as data2 } from "./reexport.js";
import * as reexport from "./reexport.js";

import { data as dynamicData } from "./dynamic.js";
import * as dynamicStar from "./dynamic.js";
import dynamicDef from "./dynamic.js";

import { data as flaggedData } from "./flagged.js";
import * as flaggedStar from "./flagged.js";
import flaggedDef from "./flagged.js";

import { data as dynamicFlaggedData } from "./dynamicFlagged.js";
import * as dynamicFlaggedStar from "./dynamicFlagged.js";
import dynamicFlaggedDef from "./dynamicFlagged.js";

import * as jsonStar from "./data.json";
import jsonDef from "./data.json";

it("should get correct values when importing named exports from a CommonJs module from non-mjs", function () {
	expect(typeof data).toBe("string");
	expect({ data }).toEqual({ data: "ok" });
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
		data: "ok",
		default: "default"
	});
	expect({ star }).toEqual({
		star: {
			data: "ok",
			default: "default"
		}
	});
	expect(star.default).toEqual({
		data: "ok",
		default: "default"
	});
	expect(ns).toEqual({
		data: "ok",
		default: "default"
	});
	expect(def1).toEqual({
		data: "ok",
		default: "default"
	});
	expect(def2).toEqual({
		data: "ok",
		default: "default"
	});
	expect(typeof data2).toBe("string");
	expect({ data2 }).toEqual({ data2: "ok" });
	expect(reexport).toEqual(
		nsObj({
			ns: {
				data: "ok",
				default: "default"
			},
			default: {
				data: "ok",
				default: "default"
			},
			def: {
				data: "ok",
				default: "default"
			},
			data: "ok"
		})
	);
});

it("should get correct values when importing named exports from a flagged module from non-mjs", function () {
	expect(typeof flaggedData).toBe("string");
	expect({ flaggedData }).toEqual({ flaggedData: "ok" });
	expect(flaggedDef).toBe("default");
	expect({ flaggedDef }).toEqual({
		flaggedDef: "default"
	});
	expect(flaggedStar).toEqual({
		__esModule: true,
		default: "default",
		data: "ok"
	});
	expect({ flaggedStar }).toEqual({
		flaggedStar: {
			__esModule: true,
			default: "default",
			data: "ok"
		}
	});
	expect(flaggedStar.default).toBe("default");
});

it("should get correct values when importing named exports from a dynamic (non-flagged) module from non-mjs", function () {
	expect(typeof dynamicData).toBe("string");
	expect({ dynamicData }).toEqual({ dynamicData: "ok" });
	expect(dynamicDef).toEqual({
		__esModule: false,
		data: "ok",
		default: "default"
	});
	expect({ dynamicDef }).toEqual({
		dynamicDef: {
			__esModule: false,
			data: "ok",
			default: "default"
		}
	});
	expect(dynamicStar).toEqual({
		__esModule: false,
		data: "ok",
		default: "default"
	});
	expect({ dynamicStar }).toEqual({
		dynamicStar: {
			__esModule: false,
			data: "ok",
			default: "default"
		}
	});
	expect(dynamicStar.default).toEqual({
		__esModule: false,
		data: "ok",
		default: "default"
	});
});

it("should get correct values when importing named exports from a dynamic (flagged) module from non-mjs", function () {
	expect(typeof dynamicFlaggedData).toBe("string");
	expect({ dynamicFlaggedData }).toEqual({ dynamicFlaggedData: "ok" });
	expect(dynamicFlaggedDef).toBe("default");
	expect({ dynamicFlaggedDef }).toEqual({
		dynamicFlaggedDef: "default"
	});
	expect(dynamicFlaggedStar).toEqual({
		__esModule: true,
		default: "default",
		data: "ok"
	});
	expect({ dynamicFlaggedStar }).toEqual({
		dynamicFlaggedStar: {
			__esModule: true,
			default: "default",
			data: "ok"
		}
	});
	expect(dynamicFlaggedStar.default).toBe("default");
});

it("should get correct values when importing named exports from a default-only module from non-mjs", function () {
	expect(jsonDef).toEqual({
		__esModule: true,
		data: "ok",
		default: "default"
	});
	expect({ jsonDef }).toEqual({
		jsonDef: {
			__esModule: true,
			data: "ok",
			default: "default"
		}
	});
	expect(jsonStar).toEqual(
		nsObj({
			data: "ok",
			default: {
				__esModule: true,
				data: "ok",
				default: "default"
			}
		})
	);
	expect({ jsonStar }).toEqual({
		jsonStar: nsObj({
			data: "ok",
			default: {
				__esModule: true,
				data: "ok",
				default: "default"
			}
		})
	});
	expect(jsonStar.default).toEqual({
		__esModule: true,
		data: "ok",
		default: "default"
	});
});
