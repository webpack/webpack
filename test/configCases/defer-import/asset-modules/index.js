// `import defer` coverage for every asset module type webpack supports.
// The TC39 import-defer proposal mandates that the deferred namespace expose
// the same exports with the same values as the eager (non-defer) form. Asset
// modules have no observable evaluation side effects, so the deferred and
// eager namespaces must be equivalent.
//
// Asset modules are webpack-specific concepts with no native Node.js loader,
// so for `asset/resource` (URL string) and `asset/inline` (data URI) the
// alignment we assert is the proposal-level invariant — defer must not
// change what a module exports. For `asset/source` (text) and `asset/bytes`
// (Uint8Array) we additionally cross-check the value against `fs.readFileSync`
// of the same source file: the most direct Node.js reference available.

// asset/source via `with { type: "text" }` (default rule in lib/config/defaults.js)
import defer * as deferText from "./payload.txt" with { type: "text" };
import textEager from "./payload.txt?eager-text" with { type: "text" };

// asset/bytes via `with { type: "bytes" }` (default rule in lib/config/defaults.js)
import defer * as deferBytes from "./payload.txt" with { type: "bytes" };
import bytesEager from "./payload.txt?eager-bytes" with { type: "bytes" };

// asset/resource — URL string (configured by module.rules)
import defer * as deferResource from "./payload.svg";
import resourceEager from "./payload.svg?eager";

// asset/inline — data URI string (configured by module.rules with resourceQuery)
import defer * as deferInline from "./payload.svg?inline";
import inlineEager from "./payload.svg?inline&eager";

// JS wrappers around each asset type — used to verify the TC39 import-defer
// invariant that evaluation must be delayed until first observable access on
// the namespace. Asset modules have no observable evaluation side effects of
// their own, so each wrapper calls `touch()` at top level; the wrapper
// (and therefore the asset module behind it) must not be evaluated until
// `wrapped*.default` is first read.
import defer * as wrappedText from "./wrapper-text.js";
import defer * as wrappedBytes from "./wrapper-bytes.js";
import defer * as wrappedResource from "./wrapper-resource.js";
import defer * as wrappedInline from "./wrapper-inline.js";

import {
	assertTouched,
	assertUntouched,
	reset
} from "./side-effect-counter.cjs";

// Normalize CRLF -> LF for cross-platform stability — `.gitattributes`
// pins this directory to `eol=lf`, but defending in code keeps the test
// robust if a user has a stricter `core.autocrlf` override.
const normalize = s => s.replace(/\r\n/g, "\n");
const PAYLOAD_TEXT = "hello asset modules\n";

function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || ns === null) {
		throw new TypeError("namespace is not an object");
	}
	if (!ns[Symbol.toStringTag]) {
		throw new Error(
			"namespace object does not have a Symbol.toStringTag property"
		);
	}
}

function assertOnlyDefault(ns) {
	expect(Reflect.has(ns, "default")).toBe(true);
	expect(Reflect.has(ns, "value")).toBe(false);
	expect(Reflect.get(ns, "value")).toBe(undefined);
}

async function readFixtureBytes(name) {
	const fs = await import("fs");
	const url = await import("url");
	return fs.readFileSync(new url.URL(`./${name}`, import.meta.url));
}

it("should defer asset/source via static `import defer` + `with { type: 'text' }`", async () => {
	assertIsNamespaceObject(deferText);
	assertOnlyDefault(deferText);

	expect(typeof deferText.default).toBe("string");
	expect(normalize(deferText.default)).toBe(PAYLOAD_TEXT);
	// Per the TC39 proposal, deferred and eager namespaces must agree.
	expect(deferText.default).toBe(textEager);

	// Node.js cross-check — webpack's text == fs.readFileSync as utf-8.
	const ref = await readFixtureBytes("payload.txt");
	expect(deferText.default).toBe(ref.toString("utf8"));
});

it("should defer asset/source via dynamic `import.defer` + `with { type: 'text' }`", async () => {
	const dyn = await import.defer("./payload.txt", { with: { type: "text" } });
	assertIsNamespaceObject(dyn);
	assertOnlyDefault(dyn);
	expect(normalize(dyn.default)).toBe(PAYLOAD_TEXT);
	expect(dyn.default).toBe(deferText.default);
});

it("should defer asset/bytes via static `import defer` + `with { type: 'bytes' }`", async () => {
	assertIsNamespaceObject(deferBytes);
	assertOnlyDefault(deferBytes);

	const decoder = new TextDecoder("utf-8");
	expect(normalize(decoder.decode(deferBytes.default))).toBe(PAYLOAD_TEXT);
	// Per the TC39 proposal, deferred and eager namespaces must agree.
	expect(decoder.decode(deferBytes.default)).toBe(
		decoder.decode(bytesEager)
	);

	// Node.js cross-check — webpack's bytes == fs.readFileSync.
	const ref = await readFixtureBytes("payload.txt");
	expect(Buffer.from(deferBytes.default)).toEqual(ref);
});

it("should defer asset/bytes via dynamic `import.defer` + `with { type: 'bytes' }`", async () => {
	const dyn = await import.defer("./payload.txt", { with: { type: "bytes" } });
	assertIsNamespaceObject(dyn);
	assertOnlyDefault(dyn);
	const decoder = new TextDecoder("utf-8");
	expect(normalize(decoder.decode(dyn.default))).toBe(PAYLOAD_TEXT);
	expect(decoder.decode(dyn.default)).toBe(
		decoder.decode(deferBytes.default)
	);
});

it("should defer asset/resource (URL) via static `import defer`", () => {
	assertIsNamespaceObject(deferResource);
	assertOnlyDefault(deferResource);

	expect(typeof deferResource.default).toBe("string");
	// `output.assetModuleFilename` is `[hash][ext]`.
	expect(deferResource.default).toMatch(/^[\da-f]+\.svg$/);
	// Per the TC39 proposal, deferred and eager namespaces must agree.
	expect(deferResource.default).toBe(resourceEager);
});

it("should defer asset/resource (URL) via dynamic `import.defer`", async () => {
	const dyn = await import.defer("./payload.svg?dyn-resource");
	assertIsNamespaceObject(dyn);
	assertOnlyDefault(dyn);
	expect(typeof dyn.default).toBe("string");
	expect(dyn.default).toMatch(/^[\da-f]+\.svg$/);
});

it("should defer asset/inline (data URI) via static `import defer`", () => {
	assertIsNamespaceObject(deferInline);
	assertOnlyDefault(deferInline);

	expect(typeof deferInline.default).toBe("string");
	expect(deferInline.default).toMatch(/^data:image\/svg\+xml(;|,)/);
	// Per the TC39 proposal, deferred and eager namespaces must agree.
	expect(deferInline.default).toBe(inlineEager);
});

it("should defer asset/inline (data URI) via dynamic `import.defer`", async () => {
	const dyn = await import.defer("./payload.svg?inline&dyn");
	assertIsNamespaceObject(dyn);
	assertOnlyDefault(dyn);
	expect(typeof dyn.default).toBe("string");
	expect(dyn.default).toMatch(/^data:image\/svg\+xml(;|,)/);
});

it("should produce equivalent namespaces for `webpackMode: \"eager\"` defer", async () => {
	const eager = await import.defer(
		/* webpackMode: "eager" */ "./payload.txt",
		{ with: { type: "text" } }
	);
	assertIsNamespaceObject(eager);
	expect(normalize(eager.default)).toBe(PAYLOAD_TEXT);
	expect(eager.default).toBe(deferText.default);
});

it("should defer evaluation until first access for every asset module type (TC39 spec invariant)", () => {
	// asset/source via `with { type: "text" }`
	reset();
	assertIsNamespaceObject(wrappedText);
	assertUntouched();
	expect(normalize(wrappedText.default)).toBe(PAYLOAD_TEXT);
	assertTouched();

	// asset/bytes via `with { type: "bytes" }`
	reset();
	assertIsNamespaceObject(wrappedBytes);
	assertUntouched();
	expect(
		normalize(new TextDecoder("utf-8").decode(wrappedBytes.default))
	).toBe(PAYLOAD_TEXT);
	assertTouched();

	// asset/resource — URL string
	reset();
	assertIsNamespaceObject(wrappedResource);
	assertUntouched();
	expect(wrappedResource.default).toMatch(/^[\da-f]+\.svg$/);
	assertTouched();

	// asset/inline — data URI string
	reset();
	assertIsNamespaceObject(wrappedInline);
	assertUntouched();
	expect(wrappedInline.default).toMatch(/^data:image\/svg\+xml(;|,)/);
	assertTouched();
});
