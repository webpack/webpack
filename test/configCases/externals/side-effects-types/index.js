import "var-free";
import "var-keep";
import "assign-free";
import "assign-keep";
import "this-free";
import "this-keep";
import "global-free";
import "global-keep";
import "commonjs-free";
import "commonjs-keep";
import "commonjs2-free";
import "commonjs2-keep";
import "commonjs-module-free";
import "commonjs-module-keep";
import "commonjs-static-free";
import "commonjs-static-keep";
import "node-commonjs-free";
import "node-commonjs-keep";
import "promise-free";
import "promise-keep";
import "import-free";
import "import-keep";
import "module-import-free";
import "module-import-keep";

// an external is in the output when it ended up in a chunk
const included = (name) => {
	const externals = __STATS__.modules
		.flatMap((module) => [module, ...(module.modules || [])])
		.filter((module) => module.identifier.startsWith("external "));
	const external = externals.find(
		(module) =>
			module.identifier.includes(`"${name}"`) ||
			module.identifier.includes(`'${name}'`)
	);
	if (!external) throw new Error(`no external for ${name}`);
	return external.chunks.length > 0;
};

const TYPES = [
	"var",
	"assign",
	"this",
	"global",
	"commonjs",
	"commonjs2",
	"commonjs-module",
	"commonjs-static",
	"node-commonjs",
	"promise",
	"import",
	"module-import"
];

it("should drop a side-effect-free external of every external type", () => {
	for (const type of TYPES) {
		expect([type, included(`${type}-free`)]).toEqual([type, false]);
	}
});

it("should keep an external of every external type which may have side effects", () => {
	for (const type of TYPES) {
		expect([type, included(`${type}-keep`)]).toEqual([type, true]);
	}
});

// the types whose evaluation is observable at runtime
const EVALUATING_TYPES = [
	"var",
	"promise",
	"import",
	"module-import",
	"commonjs",
	"commonjs2",
	"commonjs-module",
	"commonjs-static",
	"node-commonjs"
];

it("should evaluate a kept external and not a dropped one", () => {
	for (const type of EVALUATING_TYPES) {
		expect(EVALUATED).toContain(`${type}-keep`);
		expect(EVALUATED).not.toContain(`${type}-free`);
	}
});

it("should keep a side-effect-free external behind a dynamic import", () =>
	import("dynamic-free").then(() => {
		expect(included("dynamic-free")).toBe(true);
		expect(EVALUATED).toContain("dynamic-free");
	}));
