import { value } from "./dep.js";

const identifiers = { async: 1, "\u{1F600}": 2 };
const unicodeProperty = /\p{Script=Greek}+/u;
const setNotation = /[\p{ASCII}--[a-z]]/v;

class Counter {
	#count = 0n;
	static #instances = new Set();
	static {
		Counter.#instances.add(null);
	}
	get count() {
		return this.#count;
	}
}

async function* stream(source) {
	for await (const chunk of source ?? []) {
		yield chunk?.value ?? 0;
	}
}

label: for (let index = 0; index < 1; index++) {
	switch (index) {
		case 0:
			continue label;
		default:
			break label;
	}
}

try {
	throw new Counter();
} catch {
	// optional catch binding
}

export default {
	identifiers,
	unicodeProperty,
	setNotation,
	stream,
	value,
	tagged: String.raw`a${1}b`,
	meta: import.meta.url,
	optional: (globalThis?.a?.[0] ?? [])?.b?.(1)
};
