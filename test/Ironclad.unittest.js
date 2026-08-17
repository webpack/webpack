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
			// The transfer list of the consuming call is part of the call.
			[
				"const buffer = new ArrayBuffer(8);",
				"worker.postMessage(buffer, [buffer]);"
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
				code: "const a = { x: 1 };\nconst b = a;\nuse(a);",
				options: [{ implicitMove: true }],
				errors: [{ messageId: "useAfterMove" }]
			}
		]
	});
});
