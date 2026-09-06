const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const page = fs
	.readFileSync(path.resolve(__dirname, "page.html"))
	.toString("utf-8");

// An end tag takes anything after the name, so `</script foo>` closes one too.
const SCRIPT_REGEXP = /<script\b([^>]*)>([\s\S]*?)<\/script(?:[\s/][^>]*)?>/gi;

// Read with `exec`: the harness runs this bundle on the Node baseline, which
// has no `String.prototype.matchAll`.
const scripts = [];
for (
	let match = SCRIPT_REGEXP.exec(page);
	match !== null;
	match = SCRIPT_REGEXP.exec(page)
) {
	scripts.push({ attributes: match[1], body: match[2] });
}

const parses = (body, sourceType) => {
	try {
		acorn.parse(body, {
			ecmaVersion: "latest",
			sourceType,
			allowAwaitOutsideFunction: sourceType === "module"
		});
		return true;
	} catch (error) {
		return false;
	}
};

it("keeps every script element of the page", () => {
	expect(scripts).toHaveLength(7);
});

it("minifies a classic script as one, keeping its top-level names", () => {
	// A classic script's top-level `function` is a global, so no minifier may
	// drop or rename it; the body inside it is fair game.
	expect(scripts[0].body).toContain("function sharedFn(");
	expect(scripts[0].body).not.toContain("result");
	expect(parses(scripts[0].body, "script")).toBe(true);
	expect(scripts[1].body).toBe("window.essenceRan=!0;");
});

it("minifies a module script as a module", () => {
	// Read as a module: the top-level `await` parses, and an unused top-level
	// binding is module-local, so it goes — neither holds for a classic script.
	const body = scripts[2].body;
	expect(scripts[2].attributes).toContain("module");
	expect(body).toContain("await Promise.resolve()");
	expect(body).not.toContain("unusedTop");
	expect(parses(body, "module")).toBe(true);
	expect(parses(body, "script")).toBe(false);
});

it("keeps a `</script>` inside a string from closing the element", () => {
	expect(scripts[3].body).toContain("window.closer=");
	expect(scripts[3].body).not.toContain("</script>");
	expect(parses(scripts[3].body, "script")).toBe(true);
});

it("leaves a data block and a script of an unknown type as written", () => {
	expect(scripts[4].body).toContain("{{  each   item  }}");
	expect(scripts[5].body).toContain("var   notAnEssence   =   1 ;");
	expect(scripts[6].body).toBe("");
});
