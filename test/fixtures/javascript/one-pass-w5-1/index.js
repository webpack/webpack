const pick = (value) => {
	if (value) {
		return "yes";
	} else {
		return "no";
	}
};
const chain = (value) => {
	if (value === 1) {
		return "one";
	} else if (value === 2) {
		return "two";
	} else {
		return "many";
	}
	return "never";
};
const object = (value) => {
	if ({ a: value }.a) return 1;
	else return 2;
};
const hoisted = (value) => {
	if (value) return later;
	else return 2;
	var later;
};
const folded = (value) => {
	if ([{ a: value }][0].a()) return 1;
	return 2;
};
console.log(pick(1), pick(0), chain(1), chain(2), chain(3));
console.log(object(1), object(0), hoisted(1), hoisted(0), folded(() => 1), folded(() => 0));
