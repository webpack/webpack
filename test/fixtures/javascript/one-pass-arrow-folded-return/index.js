// An arrow whose one `if` prints as the `return` it guards returns that value.
const one = "PASS";
var get = () => {
	if (one) return one;
};
{
	let one = get();
	console.log(one);
}
var object = () => {
	if (1) {
		return { a: 1 };
	}
};
console.log(object().a);
var member = () => {
	if ("a") return {}.a;
};
console.log(member());
var listed = () => {
	if (!0) return 1, 2;
};
console.log(listed());
var tested = x => {
	if (1) return x in { a: 1 };
};
console.log(tested("a"));
for (
	var looped = () => {
			if (1) return "a" in { a: 1 };
		},
		i = 0;
	i < 1;
	i++
)
	console.log(looped());
var voided = () => {
	if (1) return void 0;
};
console.log(voided());
var kept = x => {
	if (x) return 2;
};
console.log(kept(0), kept(1));
