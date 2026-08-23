"use strict";

const fs = require("fs");
const path = require("path");

const emitted = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit both phases natively for the deno target", () => {
	const content = emitted("deno-phases.mjs");

	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_defer\w* from "ext-defer";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
});

it("should emit the source phase natively for the node target", () => {
	expect(emitted("node-phases.mjs")).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
});
