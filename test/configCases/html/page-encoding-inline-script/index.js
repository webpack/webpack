const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const { TextDecoder } = __non_webpack_require__("util");
const vm = __non_webpack_require__("vm");

const page = () =>
	new TextDecoder("windows-1252").decode(
		fs.readFileSync(path.join(__dirname, "page.html"))
	);

const run = () => {
	// every inline script the page holds, which webpack writes as `<script>`
	const scripts = [...page().matchAll(/<script\b[^>]*>([^]*?)<\/script\b[^>]*>/gi)];
	const window = {};
	const context = vm.createContext({ window, self: window });
	for (const [, code] of scripts) vm.runInContext(code, context);
	return window.__results;
};

it("should write the inlined script in characters of the page's encoding", () => {
	// a character the encoding lacks would be a character reference, which a script does not read
	expect(page()).not.toContain("&#");
	expect(run()).toBeDefined();
});

it("should keep what a tagged template reads", () => {
	const results = run();
	expect(results.raw).toBe("a★\\n2☆");
	expect(results.cooked).toEqual(["★", "☆"]);
	expect(results.rawStrings).toEqual(["★", "☆"]);
	expect(results.nested).toBe("<★>");
	expect(results.member).toBe("m★");
});

it("should keep a tagged template's strings the same at one call site", () => {
	const results = run();
	expect(results.sameSite).toBe(true);
	expect(results.frozen).toBe(true);
});

it("should keep an escaped character and an astral identifier", () => {
	const results = run();
	expect(results.identity).toBe("★");
	expect(results.continued).toBe("ab");
	expect(results.astral).toBe(2);
});
