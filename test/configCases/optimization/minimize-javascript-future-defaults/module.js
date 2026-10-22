export function describe(value) {
	const kind = value % 2 === 0 ? "even" : "odd";
	return `${kind}:${value}`;
}

export function labelled() {
	const seen = [];
	outer: for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			if (j > i) continue outer;
			if (i === 2 && j === 2) break outer;
			seen.push(j);
		}
	}
	return seen.slice(0, 5);
}

export function shapes() {
	const { a = 1, ...rest } = { "b-c": 2, d: [1, 2] };
	return { a, ...rest, e: (() => "x")() };
}

export function strings() {
	return ["a\"b", "c'd", "</script>", " ", "\0" + "1", "é"];
}

export function template(name) {
	return `<${name}>\${y}\n`;
}
