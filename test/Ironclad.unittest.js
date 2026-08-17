"use strict";

const { RuleTester } = require("eslint");
const rule = require("../tooling/ironclad/rules/ownership");

const ruleTester = new RuleTester({
	languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" }
});

describe("ironclad/ownership", () => {
	ruleTester.run("ownership", rule, {
		valid: [
			// No marker, no opinion: `implicitMove` is opt-in.
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
			// Inherited method names are not locks — `locksReceiver.toString` must
			// not resolve through Object.prototype.
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
				// The canvas is consumed by the call, not passed to it.
				code: [
					"const canvas = document.createElement('canvas');",
					"const offscreen = canvas.transferControlToOffscreen();",
					"canvas.getContext('2d');"
				].join("\n"),
				errors: [{ messageId: "useAfterMove" }]
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
				options: [{ implicitMove: true }],
				errors: [{ messageId: "useAfterMove" }]
			}
		]
	});
});
