const log = (value) => console.log("log", value);
const sequence = (value) => {
	log(value);
	if (value) return 1;
	return 2;
};
const several = (value) => {
	log(value);
	if (value > 1) log(value);
	else log(-value);
	if (value) return 1;
	else if (value === 0) return 0;
	else return 2;
};
const ambiguous = (value) => {
	({}).a = value;
	if (value) return 1;
	return 2;
};
console.log(sequence(1), sequence(0), several(2), several(0), ambiguous(1));
