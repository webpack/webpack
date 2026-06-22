"use strict";

// Stub Deno's runtime-resolved protocol imports so the case runs offline.
module.exports = {
	modules: {
		"npm:canvas": { version: "2.0" },
		"jsr:@std/path": { join: (...segments) => segments.join("/") },
		"https://deno.land/x/foo/mod.ts": { value: "remote" }
	}
};
