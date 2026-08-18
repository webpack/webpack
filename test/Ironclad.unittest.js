"use strict";

const { RuleTester } = require("eslint");
const rule = require("../tooling/ironclad/rules/ownership");
const testTypeParser = require("../tooling/ironclad/testTypeParser");

const ruleTester = new RuleTester({
	languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" }
});

/**
 * @param {Record<string, string>} types declared type per identifier name
 * @returns {import("eslint").Linter.LanguageOptions} language options driving
 * the rule's type-aware path
 */
const withTypes = (types) => ({
	parser: testTypeParser,
	parserOptions: { ecmaVersion: 2022, sourceType: "script", types }
});

/**
 * @param {Record<string, string>} modules other modules, by file name
 * @returns {import("eslint").Linter.LanguageOptions} language options with a
 * real TypeScript program behind them
 */
const withModules = (modules) => ({
	parser: testTypeParser,
	parserOptions: { ecmaVersion: 2022, sourceType: "script", modules }
});

const LIBRARY = [
	"/**",
	" * @param {object} config the config",
	" * @move config",
	" */",
	"function consume(config) {",
	"\treturn config;",
	"}",
	"/**",
	" * @param {object} config the config",
	" * @borrow config",
	" * @borrow return",
	" */",
	"function rulesOf(config) {",
	"\treturn config.rules;",
	"}",
	"/** @move return */",
	"function acquire() {",
	"\treturn {};",
	"}",
	"const send = (/** @move */ payload) => payload;"
].join("\n");

describe("ironclad/ownership", () => {
	ruleTester.run("ownership", rule, {
		valid: [
			// No marker, no opinion: `treatAssignmentAsMove` is opt-in.
			"const a = { x: 1 };\nconst b = a;\nuse(a);",
			// Reads before the move are fine.
			"const a = { x: 1 };\nuse(a);\nconst b = /** @move */ a;",
			// Moved in one branch, used in the other.
			[
				"const a = { x: 1 };",
				"if (cond) {",
				"\tconst b = /** @move */ a;",
				"} else {",
				"\tuse(a);",
				"}"
			].join("\n"),
			// Many shared borrows may coexist.
			[
				"const a = { x: 1 };",
				"const r1 = /** @borrow */ a;",
				"const r2 = /** @borrow */ a;",
				"use(r1, r2, a.x);"
			].join("\n"),
			// Non-lexical: the borrow dies at its last use, not at the block end.
			[
				"const a = { x: 1 };",
				"const m = /** @borrowMut */ a;",
				"m.x = 2;",
				"use(a.x);"
			].join("\n"),
			// Primitives are copied, so a consuming call does not move them.
			"const a = 1;\nworker.postMessage(a);\nuse(a);",
			// `postMessage` without a transfer list structured-clones, it does not
			// detach — the original stays usable.
			[
				"const buffer = new ArrayBuffer(8);",
				"worker.postMessage(buffer);",
				"use(buffer.byteLength);"
			].join("\n"),
			// The transfer list of the consuming call is part of the call.
			[
				"const buffer = new ArrayBuffer(8);",
				"worker.postMessage(buffer, [buffer]);"
			].join("\n"),
			// The move cannot happen twice, so it is not a use after move.
			[
				"const a = { x: 1 };",
				"for (const item of list) {",
				"\tconsume(/** @move */ a);",
				"\tbreak;",
				"}"
			].join("\n"),
			// Inherited method names are not locks — `locksReceiverUntil.toString`
			// must not resolve through Object.prototype.
			[
				"const code = getSource();",
				"const text = code.toString();",
				"use(code, text);"
			].join("\n"),
			// A released lock frees the stream again.
			[
				"const stream = response.body;",
				"const reader = stream.getReader();",
				"reader.releaseLock();",
				"const second = stream.getReader();",
				"use(second);"
			].join("\n"),
			// Separate switch cases are separate paths.
			[
				"const a = { x: 1 };",
				"switch (k) {",
				"\tcase 1: consume(/** @move */ a); break;",
				"\tcase 2: use(a); break;",
				"}"
			].join("\n"),
			// The loop body cannot run twice.
			[
				"function run() {",
				"\tconst a = { x: 1 };",
				"\tfor (const item of list) {",
				"\t\tconsume(/** @move */ a);",
				"\t\treturn;",
				"\t}",
				"}"
			].join("\n"),
			// The loop owns what it declares.
			[
				"for (const item of list) {",
				"\tconst a = { x: 1 };",
				"\tconsume(/** @move */ a);",
				"}"
			].join("\n"),
			// An immediately invoked function runs once, so moving from inside it
			// is an ordinary move.
			[
				"const a = { x: 1 };",
				"(() => {",
				"\tconsume(/** @move */ a);",
				"})();"
			].join("\n"),
			// The closure owns what it declares.
			[
				"items.forEach(() => {",
				"\tconst a = { x: 1 };",
				"\tconsume(/** @move */ a);",
				"});"
			].join("\n"),
			// Known false negative, pinned: the closure is written before the move
			// but runs after it. Source order cannot see that.
			[
				"const a = { x: 1 };",
				"setTimeout(() => use(a));",
				"const b = /** @move */ a;"
			].join("\n"),
			{
				// Types narrow the platform table: this `getReader` is not a stream's,
				// so it takes no lock.
				code: [
					"const notAStream = makeThing();",
					"const reader = notAStream.getReader();",
					"notAStream.read();",
					"use(reader);"
				].join("\n"),
				languageOptions: withTypes({ notAStream: "Thing" })
			},
			{
				// A transfer list of primitives moves nothing.
				code: [
					"const count = compute();",
					"worker.postMessage(payload, [count]);",
					"use(count);"
				].join("\n"),
				languageOptions: withTypes({ count: "number" })
			},
			// A leading comment on a call is the call's, not its arguments'.
			"const a = { x: 1 };\n/** @move */ f(a);\nuse(a);",
			// `@move` has to be a tag, not a substring of prose.
			[
				"const a = { x: 1 };",
				"/** see docs@move for details */",
				"const b = a;",
				"use(a);"
			].join("\n"),
			{
				// A consumed member leaves the rest of the object alone.
				code: [
					"const res = getResponse();",
					"const data = res.json();",
					"report(res.status, res.headers, data);"
				].join("\n"),
				options: [{ consumesReceiverMember: { "Body#json": "body" } }]
			},
			{
				// Passing the response on is fine: consuming the body does not
				// consume the response.
				code: [
					"const res = getResponse();",
					"const data = res.json();",
					"log(res, data);"
				].join("\n"),
				options: [{ consumesReceiverMember: { "Body#json": "body" } }]
			},
			// A sibling field is untouched by a marker on one member.
			[
				"const data = load();",
				"const rules = /** @move */ data.rules;",
				"apply(data.plugins, rules);"
			].join("\n"),
			// Generic method names are not consuming calls by default.
			[
				"const callbacks = makeCallbacks();",
				"render(() => callbacks.text(input));",
				"use(callbacks.text);"
			].join("\n"),
			{
				// An untouched field survives the partial move of its sibling.
				code: [
					"const data = load();",
					"const { rules } = data;",
					"apply(data.plugins, rules);"
				].join("\n"),
				options: [{ treatDestructuringAsPartialMove: true }]
			},
			// Destructuring is a plain read unless asked otherwise.
			[
				"const data = load();",
				"const { rules } = data;",
				"apply(data, rules);"
			].join("\n"),
			// A parameter declared `@borrow` only reads its argument.
			[
				"function read(/** @borrow */ config) {",
				"\treturn config.mode;",
				"}",
				"const options = load();",
				"read(options);",
				"use(options);"
			].join("\n"),
			// A mutable borrow that ends with the call leaves the value usable.
			[
				"function update(/** @borrowMut */ stats) {",
				"\tstats.n++;",
				"}",
				"const counters = load();",
				"update(counters);",
				"report(counters.n);"
			].join("\n"),
			// An unmarked signature declares nothing.
			[
				"function read(config) {",
				"\treturn config.mode;",
				"}",
				"const options = load();",
				"read(options);",
				"use(options);"
			].join("\n"),
			// A returned borrow dies with its holder, like any other.
			[
				"/**",
				" * @borrowMut table",
				" * @borrowMut return",
				" */",
				"function entryOf(table) {",
				"\treturn table.head;",
				"}",
				"const store = load();",
				"const entry = entryOf(store);",
				"use(entry);",
				"store.size = 0;"
			].join("\n"),
			// A result that is stored is not a discarded result.
			[
				"/** @move return */",
				"function acquire() {",
				"\treturn alloc();",
				"}",
				"const handle = acquire();",
				"use(handle);"
			].join("\n"),
			// Both inputs are free once the result they share is dead.
			[
				"/**",
				" * @borrow x 'a",
				" * @borrow y 'a",
				" * @borrow return 'a",
				" */",
				"function longest(x, y) {",
				"\treturn x;",
				"}",
				"const first = load();",
				"const second = load();",
				"const best = longest(first, second);",
				"use(best);",
				"first.mutated = 1;",
				"second.mutated = 1;"
			].join("\n"),
			// A distinct lifetime is not tied to the result.
			[
				"/**",
				" * @borrow x 'a",
				" * @borrow y 'b",
				" * @borrow return 'a",
				" */",
				"function pick(x, y) {",
				"\treturn x;",
				"}",
				"const first = load();",
				"const second = load();",
				"const got = pick(first, second);",
				"second.mutated = 1;",
				"use(got);"
			].join("\n"),
			// Something declared at the top level lives long enough for `'static`.
			[
				"/** @borrow handler 'static */",
				"function addListener(handler) {}",
				"const shared = makeHandler();",
				"addListener(shared);"
			].join("\n"),
			{
				// The imported borrow ends at the result's last use, as any other.
				code: [
					"const options = { rules: [] };",
					"const rules = rulesOf(options);",
					"use(rules);",
					"options.mode = 2;"
				].join("\n"),
				languageOptions: withModules({ "lib.js": LIBRARY })
			},
			{
				// Without type services there is no program to read, so an imported
				// contract simply does not apply.
				code: [
					"const options = { mode: 1 };",
					"consume(options);",
					"use(options);"
				].join("\n")
			},
			// The struct's borrow ends when the instance holding it dies.
			[
				"class Parser {",
				"\t/**",
				"\t * @borrow input 'a",
				"\t * @borrow return 'a",
				"\t */",
				"\tconstructor(input) {",
				"\t\tthis.input = input;",
				"\t}",
				"}",
				"const source = load();",
				"const parser = new Parser(source);",
				"use(parser);",
				"source.mutated = 1;"
			].join("\n"),
			// A callback the callee promises to run once cannot repeat its move.
			[
				"/** @once callback */",
				"function defer(callback) {}",
				"const session = open();",
				"defer(() => {",
				"\tclose(/** @move */ session);",
				"});"
			].join("\n"),
			// `setTimeout` is in the default `callsOnce` list.
			[
				"const session = open();",
				"setTimeout(() => {",
				"\tclose(/** @move */ session);",
				"});"
			].join("\n"),
			// `@once` marks how the callback is called, it does not borrow it.
			[
				"function defer(/** @once */ callback) {}",
				"const cb = makeCallback();",
				"defer(cb);",
				"use(cb);"
			].join("\n"),
			// A field initialized from a parameter is the struct case, not a leak.
			[
				"class Parser {",
				"\t/**",
				"\t * @borrow input 'a",
				"\t * @borrow return 'a",
				"\t */",
				"\tconstructor(input) {",
				"\t\tconst view = /** @borrow */ input;",
				"\t\tthis.view = view;",
				"\t}",
				"}"
			].join("\n"),
			// A borrow assigned into an inner scope does not outlive the owner.
			[
				"function run() {",
				"\tconst a = { x: 1 };",
				"\tconst r = /** @borrow */ a;",
				"\treturn r.x;",
				"}"
			].join("\n")
		],
		invalid: [
			{
				code: "const a = { x: 1 };\nconst b = /** @move */ a;\nuse(a);",
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// Moved in one branch is moved after the merge point.
				code: [
					"const a = { x: 1 };",
					"if (cond) {",
					"\tconst b = /** @move */ a;",
					"}",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				code: [
					"const a = { x: 1 };",
					"for (const item of list) {",
					"\tconsume(/** @move */ a);",
					"}"
				].join("\n"),
				errors: [{ messageId: "moveInLoop" }]
			},
			{
				// A case that falls out of the switch still moved.
				code: [
					"const a = { x: 1 };",
					"switch (k) {",
					"\tcase 1: consume(/** @move */ a); break;",
					"}",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// The try block may have run before it threw.
				code: [
					"const a = { x: 1 };",
					"try {",
					"\tconsume(/** @move */ a);",
					"} catch (e) {",
					"\tuse(a);",
					"}"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// `finally` always runs, so its moves reach the continuation — which
				// ESLint does not model as a successor edge.
				code: [
					"const a = { x: 1 };",
					"try {",
					"\trun();",
					"} finally {",
					"\tconsume(/** @move */ a);",
					"}",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// A do-while body always runs at least twice if the test passes.
				code: [
					"const a = { x: 1 };",
					"do {",
					"\tconsume(/** @move */ a);",
					"} while (cond);"
				].join("\n"),
				errors: [{ messageId: "moveInLoop" }]
			},
			{
				// A type cast and a marker share one JSDoc block. ESTree drops the
				// grouping parens, so the comment sits before a token that is not in
				// the tree.
				code: [
					"const a = { x: 1 };",
					"const b = /** @type {Foo} @move */ (a);",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// The same cast shape with the marker inside the parens.
				code: [
					"const a = { x: 1 };",
					"const b = /** @type {Foo} */ (/** @move */ a);",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// A marker on its own tag line of a multi-line JSDoc block.
				code: [
					"const a = { x: 1 };",
					"/**",
					" * @type {Foo}",
					" * @move",
					" */",
					"const b = a;",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// Rust states ownership at the signature; the call site needs no
				// marker of its own.
				code: [
					"function consume(/** @move */ config) {",
					"\treturn config.mode;",
					"}",
					"const options = load();",
					"consume(options);",
					"use(options);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// The block form names the parameter it applies to.
				code: [
					"/**",
					" * @param {Config} config the config",
					" * @move config",
					" */",
					"function consume(config) {",
					"\treturn config.mode;",
					"}",
					"const options = load();",
					"consume(options);",
					"use(options);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// A contract on an arrow stored in a variable counts too.
				code: [
					"const consume = (/** @move */ buffer) => send(buffer);",
					"const data = alloc();",
					"consume(data);",
					"use(data);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// An exclusive borrow excludes the same value in the same call.
				code: [
					"function update(/** @borrowMut */ stats, extra) {",
					"\tstats.n++;",
					"\treturn extra;",
					"}",
					"const counters = load();",
					"update(counters, counters);"
				].join("\n"),
				errors: [{ messageId: "useWhileMutablyBorrowed" }]
			},
			{
				// `@move this` is Rust's `fn into_inner(self)`.
				code: [
					"class Session {",
					"\t/** @move this */",
					"\tclose() {",
					"\t\tthis.open = false;",
					"\t}",
					"}",
					"const session = new Session();",
					"session.close();",
					"session.ping();"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// `@borrow return` carries the input's lifetime out of the call, so
				// the owner stays borrowed while the result is alive.
				code: [
					"/**",
					" * @borrow config",
					" * @borrow return",
					" */",
					"function rulesOf(config) {",
					"\treturn config.rules;",
					"}",
					"const options = load();",
					"const rules = rulesOf(options);",
					"options.mode = 'none';",
					"use(rules);"
				].join("\n"),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				// An exclusive borrow returned from a method locks its receiver.
				code: [
					"class Store {",
					"\t/**",
					"\t * @borrowMut this",
					"\t * @borrowMut return",
					"\t */",
					"\tslot() {",
					"\t\treturn this.head;",
					"\t}",
					"}",
					"const store = new Store();",
					"const slot = store.slot();",
					"report(store.size);",
					"use(slot);"
				].join("\n"),
				errors: [{ messageId: "useWhileMutablyBorrowed" }]
			},
			{
				// Rust's elision needs exactly one borrowed input to work from.
				code: [
					"/**",
					" * @borrow a",
					" * @borrow b",
					" * @borrow return",
					" */",
					"function pick(a, b) {",
					"\treturn a;",
					"}"
				].join("\n"),
				errors: [{ messageId: "unnameableReturnLifetime" }]
			},
			{
				// Naming the source resolves what elision cannot.
				code: [
					"/**",
					" * @borrow a",
					" * @borrow b",
					" * @borrow return a",
					" */",
					"function pick(a, b) {",
					"\treturn a;",
					"}",
					"const first = load();",
					"const second = load();",
					"const got = pick(first, second);",
					"first.mutated = 1;",
					"use(got);"
				].join("\n"),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				// Handing back ownership and dropping it on the floor.
				code: [
					"/** @move return */",
					"function acquire() {",
					"\treturn alloc();",
					"}",
					"acquire();"
				].join("\n"),
				errors: [{ messageId: "resultIgnored" }]
			},
			{
				// `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` — one lifetime
				// ties the result to both inputs, so either is locked.
				code: [
					"/**",
					" * @borrow x 'a",
					" * @borrow y 'a",
					" * @borrow return 'a",
					" */",
					"function longest(x, y) {",
					"\treturn x;",
					"}",
					"const first = load();",
					"const second = load();",
					"const best = longest(first, second);",
					"second.mutated = 1;",
					"use(best);"
				].join("\n"),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				// A lifetime the signature never declares names nothing.
				code: [
					"/**",
					" * @borrow x 'a",
					" * @borrow y 'a",
					" * @borrow return 'c",
					" */",
					"function pick(x, y) {",
					"\treturn x;",
					"}"
				].join("\n"),
				errors: [{ messageId: "unnameableReturnLifetime" }]
			},
			{
				// `'static` outlives the program, and a local does not.
				code: [
					"/** @borrow handler 'static */",
					"function addListener(handler) {}",
					"function setup() {",
					"\tconst local = makeHandler();",
					"\taddListener(local);",
					"}"
				].join("\n"),
				errors: [{ messageId: "borrowMustBeStatic" }]
			},
			{
				// A contract in another module is still a contract: typescript-eslint
				// hands over the whole program, so the callee's JSDoc can be read
				// wherever it lives.
				code: [
					"const options = { mode: 1 };",
					"consume(options);",
					"use(options);"
				].join("\n"),
				languageOptions: withModules({ "lib.js": LIBRARY }),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// An imported `@borrow return` carries its lifetime across the module
				// boundary too.
				code: [
					"const options = { rules: [] };",
					"const rules = rulesOf(options);",
					"options.mode = 2;",
					"use(rules);"
				].join("\n"),
				languageOptions: withModules({ "lib.js": LIBRARY }),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				// `#[must_use]` reaches across modules as well.
				code: "acquire();",
				languageOptions: withModules({ "lib.js": LIBRARY }),
				errors: [{ messageId: "resultIgnored" }]
			},
			{
				// An inline marker on an imported arrow's parameter counts, which
				// needs the parameter's raw trivia rather than its leading comments.
				code: [
					"const payload = { n: 1 };",
					"send(payload);",
					"use(payload);"
				].join("\n"),
				languageOptions: withModules({ "lib.js": LIBRARY }),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// `struct Parser<'a> { input: &'a str }` — the instance carries the
				// borrow, so its owner stays locked while the instance is alive.
				code: [
					"class Parser {",
					"\t/**",
					"\t * @borrow input 'a",
					"\t * @borrow return 'a",
					"\t */",
					"\tconstructor(input) {",
					"\t\tthis.input = input;",
					"\t}",
					"}",
					"const source = load();",
					"const parser = new Parser(source);",
					"source.mutated = 1;",
					"use(parser);"
				].join("\n"),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				// A constructor may take ownership instead.
				code: [
					"class Owner {",
					"\t/** @move input */",
					"\tconstructor(input) {",
					"\t\tthis.input = input;",
					"\t}",
					"}",
					"const source = load();",
					"const owner = new Owner(source);",
					"use(source);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// Without `@once` a callback may run any number of times, which is
				// the difference between `Fn` and `FnOnce`.
				code: [
					"const session = open();",
					"items.forEach(() => {",
					"\tclose(/** @move */ session);",
					"});"
				].join("\n"),
				errors: [{ messageId: "moveInClosure" }]
			},
			{
				// An instance that keeps a borrow of a local outlives it.
				code: [
					"class Cache {",
					"\tfill() {",
					"\t\tconst table = build();",
					"\t\tconst view = /** @borrow */ table;",
					"\t\tthis.view = view;",
					"\t}",
					"}"
				].join("\n"),
				errors: [{ messageId: "borrowEscapes" }]
			},
			{
				// A closure created after the move captures a value that is gone.
				code: [
					"const a = { x: 1 };",
					"const b = /** @move */ a;",
					"setTimeout(() => use(a));"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// The callback may run any number of times.
				code: [
					"const a = { x: 1 };",
					"items.forEach(() => {",
					"\tconsume(/** @move */ a);",
					"});"
				].join("\n"),
				errors: [{ messageId: "moveInClosure" }]
			},
			{
				// What an immediately invoked function moves stays moved outside it.
				code: [
					"const a = { x: 1 };",
					"(() => {",
					"\tconsume(/** @move */ a);",
					"})();",
					"use(a);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				code: [
					"const a = { x: 1 };",
					"const r = /** @borrow */ a;",
					"a.x = 2;",
					"use(r);"
				].join("\n"),
				errors: [{ messageId: "mutationWhileShared" }]
			},
			{
				code: [
					"const a = { x: 1 };",
					"const m = /** @borrowMut */ a;",
					"use(a.x);",
					"m.x = 2;"
				].join("\n"),
				errors: [{ messageId: "useWhileMutablyBorrowed" }]
			},
			{
				code: [
					"const a = { x: 1 };",
					"const r = /** @borrow */ a;",
					"const m = /** @borrowMut */ a;",
					"use(r, m);"
				].join("\n"),
				errors: [{ messageId: "conflictingBorrow" }]
			},
			{
				code: [
					"const a = { x: 1 };",
					"const r = /** @borrow */ a;",
					"const b = /** @move */ a;",
					"use(r);"
				].join("\n"),
				errors: [{ messageId: "moveWhileBorrowed" }]
			},
			{
				// The borrow is stored where the owner cannot reach.
				code: [
					"let escaped;",
					"function run() {",
					"\tconst a = { x: 1 };",
					"\tconst r = /** @borrow */ a;",
					"\tescaped = r;",
					"}"
				].join("\n"),
				errors: [{ messageId: "borrowEscapes" }]
			},
			{
				// `postMessage` detaches the transfer list — this really throws.
				code: [
					"const buffer = new ArrayBuffer(8);",
					"worker.postMessage(buffer, [buffer]);",
					"use(buffer.byteLength);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// `structuredClone` spells its transfer list as an option.
				code: [
					"const buffer = new ArrayBuffer(8);",
					"const copy = structuredClone(view, { transfer: [buffer] });",
					"use(buffer.byteLength);"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// Transferring control kills the canvas's rendering context, not the
				// element, so it is the `getContext` member that is consumed.
				code: [
					"const canvas = document.createElement('canvas');",
					"const offscreen = canvas.transferControlToOffscreen();",
					"canvas.getContext('2d');"
				].join("\n"),
				errors: [{ messageId: "useAfterPartialMove" }]
			},
			{
				// Both methods consume the body, so the second one is a use after
				// move even though it is spelled differently.
				code: [
					"const res = getResponse();",
					"const data = res.json();",
					"const text = res.text();",
					"use(data, text);"
				].join("\n"),
				options: [
					{
						consumesReceiverMember: { "Body#json": "body", "Body#text": "body" }
					}
				],
				errors: [{ messageId: "useAfterPartialMove" }]
			},
			{
				// Reading `.body` directly is the same member.
				code: [
					"const res = getResponse();",
					"const data = res.json();",
					"use(res.body, data);"
				].join("\n"),
				options: [
					{
						consumesReceiverMember: { "Body#json": "body", "Body#text": "body" }
					}
				],
				errors: [{ messageId: "useAfterPartialMove" }]
			},
			{
				// A marker on a member moves the field, not the object.
				code: [
					"const data = load();",
					"const rules = /** @move */ data.rules;",
					"apply(data.rules, rules);"
				].join("\n"),
				errors: [{ messageId: "useAfterPartialMove" }]
			},
			{
				// Rust forbids the whole value after a field is moved out of it.
				code: [
					"const data = load();",
					"const rules = /** @move */ data.rules;",
					"apply(data, rules);"
				].join("\n"),
				errors: [{ messageId: "wholeUseAfterPartialMove" }]
			},
			{
				// A destructured field is moved out of the object.
				code: [
					"const data = load();",
					"const { rules } = data;",
					"apply(data.rules, rules);"
				].join("\n"),
				options: [{ treatDestructuringAsPartialMove: true }],
				errors: [{ messageId: "useAfterPartialMove" }]
			},
			{
				// Rust forbids using the whole value after a partial move.
				code: [
					"const data = load();",
					"const { rules } = data;",
					"apply(data, rules);"
				].join("\n"),
				options: [{ treatDestructuringAsPartialMove: true }],
				errors: [{ messageId: "wholeUseAfterPartialMove" }]
			},
			{
				// A second reader on a locked stream throws at runtime.
				code: [
					"const stream = response.body;",
					"const first = stream.getReader();",
					"const second = stream.getReader();",
					"use(first, second);"
				].join("\n"),
				errors: [{ messageId: "conflictingBorrow" }]
			},
			{
				// The stream is locked for as long as the reader holds it.
				code: [
					"const stream = response.body;",
					"const reader = stream.getReader();",
					"stream.cancel();",
					"use(reader);"
				].join("\n"),
				errors: [{ messageId: "useWhileMutablyBorrowed" }]
			},
			{
				code: "const a = { x: 1 };\nconst b = a;\nuse(a);",
				options: [{ treatAssignmentAsMove: true }],
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// The receiver's type matches through its base types.
				code: [
					"const res = getResponse();",
					"const body = res.consume();",
					"use(res);"
				].join("\n"),
				options: [{ consumesReceiver: ["Body#consume"] }],
				languageOptions: withTypes({ res: "Response:Body" }),
				errors: [{ messageId: "useAfterMove" }]
			},
			{
				// A real stream still locks with types in play.
				code: [
					"const stream = response.body;",
					"const reader = stream.getReader();",
					"stream.cancel();",
					"use(reader);"
				].join("\n"),
				languageOptions: withTypes({ stream: "ReadableStream" }),
				errors: [{ messageId: "useWhileMutablyBorrowed" }]
			},
			{
				// Objects are still moved when the type says they are not primitive.
				code: [
					"const payload = build();",
					"worker.postMessage(message, [payload]);",
					"use(payload);"
				].join("\n"),
				languageOptions: withTypes({ payload: "Uint8Array" }),
				errors: [{ messageId: "useAfterMove" }]
			}
		]
	});
});
