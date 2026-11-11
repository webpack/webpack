class K {
	static name2() {
		return "K";
	}
}

export function syntax() {
	let updates = 0;
	updates++;
	++updates;
	let labeled = 0;
	outer: for (const value of [1, 2]) {
		for (const key in { a: 1 }) {
			labeled += value;
			if (key) continue outer;
		}
	}
	const [first, { second }, ...rest] = [1, { second: 2 }, 3];
	const object = { deep: undefined };
	return {
		defined: DEFINED,
		flag: process.env.FLAG,
		mode: typeof import.meta.env,
		typeOf: typeof DEFINED,
		folded: 1 + 2,
		labeled,
		updates,
		chain: object.deep?.missing?.(),
		destructured: [first, second, rest],
		klass: K.name2(),
		provided: provided,
		url: typeof import.meta.url === "string"
	};
}
