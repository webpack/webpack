"use strict";

import generator from "./generator_function.js";
import asyncGenerator from "./async_generator_function";

it('should correctly import generator function', () => {
	expect(typeof generator).toBe("function");
});

it('should correctly build the correct function string', () => {
	expect(generator.toString().indexOf('function*')).toBe(0); // 0
});

it('should correctly provide the generator function interface', () => {
	let gen = generator();
	expect(gen.next().value).toBe(0);
	expect(gen.next().value).toBe(1);
	expect(gen.next().value).toBe(2);
});

it('should correctly import async generator function', () => {
	expect(typeof asyncGenerator).toBe("function");
});

it('should correctly build the correct async function string', () => {
	expect(asyncGenerator.toString().indexOf('async function*')).toBe(0);
});

it('should correctly provide the async generator function interface', async () => {
	let gen = asyncGenerator(1, 5);
	let start = 0;
	for await (let value of gen) {
		start += 1;
		expect(value).toBe(start);
	}
});
