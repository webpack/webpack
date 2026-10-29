const WORDS = /[A-Z]{2,}(?=[A-Z][a-z]+|\b)|[A-Z]?[a-z]+|[A-Z]|\d+/g;

const words = (value) => String(value).match(WORDS) || [];

export function camelCase(value) {
	return words(value)
		.map((word, index) => {
			const lower = word.toLowerCase();
			return index === 0 ? lower : lower[0].toUpperCase() + lower.slice(1);
		})
		.join("");
}

export function kebabCase(value) {
	return words(value)
		.map((word) => word.toLowerCase())
		.join("-");
}

export function truncate(value, length = 30, omission = "...") {
	const text = String(value);
	if (text.length <= length) return text;
	return text.slice(0, Math.max(0, length - omission.length)) + omission;
}
