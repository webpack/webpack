import value from "./separate";
import { test as t } from "external-self";

function isBrowser() {
	return typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined';
}

it("should compile check", () => {
	expect(isBrowser() ? "web" : "node").toBe(!isBrowser() ? "node" : "web");
});

it("should compile", () => {
	expect(value).toBe(42);
});

it("should circular depend on itself external", () => {
	expect(test()).toBe(42);
	expect(t()).toBe(42);
});

it("work with URL", () => {
	const url = new URL("./file.png", import.meta.url);
	expect(/[a-f0-9]{20}\.png/.test(url)).toBe(true);
});

it("work with node.js modules", () => {
	expect(typeof (isBrowser() ? URL : require("url").URL)).toBe("function");
});

function test() {
	return 42;
}

export { test };
