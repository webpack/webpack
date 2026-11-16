const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const body = page.slice(page.indexOf("<body"));
const sheet = page.slice(page.indexOf("<style module>"), page.indexOf("</style>"));

/**
 * @param {string} text what the element holds
 * @returns {string} the element's opening tag
 */
const tagOf = (text) => {
	const end = body.indexOf(`>${text}</p>`);
	return body.slice(body.lastIndexOf("<p", end), end + 1);
};

it("should add the names `composes` pulls in from the same sheet, once each", () => {
	expect(tagOf("composes in the same sheet")).toBe(
		'<p class="m_local m_composed m_multi">'
	);
	expect(sheet).toMatch(/\.m_local \{ color: red; margin: 4px; \}/);
});

it("should add the names `composes` pulls in from a file", () => {
	expect(tagOf("composes from a file")).toBe(
		'<p class="m_fromFile base.module_base m_fromFileMany base.module_other">'
	);
});

it("should add a global name `composes` pulls in as written", () => {
	expect(tagOf("composes a global")).toBe('<p class="m_fromGlobal globalThing">');
});

it("should follow `composes` through `:import` and chains", () => {
	expect(tagOf("composes through :import and chains")).toBe(
		'<p class="m_viaImport base.module_base m_chain m_fromFile m_deepChain deep.module_deep">'
	);
	expect(sheet).toMatch(/\.m_chain \{ color: purple; \}/);
});

it("should leave `@value` names, which are not classes", () => {
	expect(tagOf("@value names are not classes")).toBe(
		'<p class="brand primaryColor sharedAlias small gap">'
	);
});

it("should leave `:export` and `:import` names, which are not classes", () => {
	expect(tagOf(":export and :import names are not classes")).toBe(
		'<p class="exportedColor exportedName importedBase">'
	);
	expect(sheet).not.toContain(":export");
	expect(sheet).not.toContain(":import");
});

it("should scope a class whose rules use values", () => {
	expect(tagOf("a value used in a declaration and a media query")).toBe(
		'<p class="m_usesValue m_responsive">'
	);
	expect(sheet).toMatch(/\.m_usesValue \{ border-width: 1px; \}/);
	expect(sheet).toMatch(
		/@media \(max-width: 600px\) \{ \.m_responsive \{ color: red; \} \}/
	);
});

it("should leave `:global` names and scope `:local` and escaped ones", () => {
	expect(tagOf(":global, :local and an escaped name")).toBe(
		'<p class="shell m_explicit m_with:colon">'
	);
	expect(sheet).toMatch(/\.shell \{ color: black; \}/);
	expect(sheet).toMatch(/\.m_with\\:colon \{ color: teal; \}/);
});

it("should let the first sheet to declare a name decide it", () => {
	// The inline sheet comes before the linked one, which declares `.dup` too.
	expect(tagOf("the first sheet to declare a name decides it")).toBe(
		'<p class="m_dup">'
	);
	// The linked sheet comes before the less one, which declares `.later` too.
	expect(tagOf("a later sheet names what no earlier one declares")).toBe(
		'<p class="linked.module_later">'
	);
});

it("should scope an id", () => {
	expect(tagOf("an id")).toBe('<p id="m_anchor">');
	expect(sheet).toMatch(/#m_anchor \{ color: red; \}/);
});

it("should scope with a linked CSS module's names", () => {
	expect(tagOf("a linked CSS module")).toBe(
		'<p id="linked.module_linkedId" class="linked.module_linked linked.module_linkedComposes base.module_other linkedToken">'
	);
	const linked = fs.readFileSync(
		path.resolve(__dirname, "linked.module.css"),
		"utf-8"
	);
	expect(linked).toMatch(/\.linked\\\.module_linked \{ color: purple; \}/);
	expect(linked).not.toContain(":export");
});

it("should name a repeated name once", () => {
	expect(tagOf("a name repeated by the author")).toBe(
		'<p class="m_local unknown">'
	);
});

it("should follow `composes` in a less module", () => {
	expect(tagOf("composes in a less module")).toBe(
		'<p class="m_lessComposes base.module_other m_lessLocal">'
	);
	expect(page).toMatch(/\.m_lessComposes \{\s*padding: 5px;\s*\}/);
});

it("should take `@value` and `composes` in an scss module", () => {
	expect(tagOf("@value and composes in an scss module")).toBe(
		'<p class="m_scssValue m_scssComposes deep.module_deep base.module_base">'
	);
	expect(page).toMatch(/\.m_scssValue \{ color: purple; width: 6px; \}/);
});

it("should leave a `@keyframes` name, which is not a class", () => {
	expect(tagOf("a @keyframes name is not a class")).toBe(
		'<p class="spin m_spinning">'
	);
	expect(sheet).toMatch(/@keyframes m_spin/);
});

it("should split a class list on ASCII whitespace only and match an id whole", () => {
	expect(tagOf("a no-break space is part of a name")).toBe(
		'<p class="local&nbsp;x" id="&nbsp;anchor">'
	);
});

it("should quote an unquoted value a scoped name makes unsafe", () => {
	expect(tagOf("an unquoted value a name makes unsafe")).toBe(
		'<p class="m_a>b">'
	);
});

it("should leave no name of a script tag the page drops", () => {
	// Consecutive inline scripts share one chunk: the first tag stays, scoped,
	// and the second goes with its `class`.
	const scripts = body.slice(body.indexOf("<script"), body.indexOf("</body>"));
	expect(scripts.trim()).toBe('<script src="page.js" class="m_local"></script>');
});

it("should scope a name only an attribute selector scopes", () => {
	expect(tagOf("a name only an attribute selector scopes")).toBe(
		'<p class="m_byAttribute">'
	);
	expect(sheet).toMatch(/\[class~="m_byAttribute"\] \{ color: coral; \}/);
});

it("should generate the page and the linked sheet", () => {
	expect(page).toMatchSnapshot();
	expect(
		fs.readFileSync(path.resolve(__dirname, "linked.module.css"), "utf-8")
	).toMatchSnapshot();
});
