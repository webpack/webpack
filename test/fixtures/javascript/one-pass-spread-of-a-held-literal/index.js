var values = [4, 5, 6];
var unused = [1, 2, ...values, 7];
var once = [1, 2];
[...once];
var object = { a: 1 };
({ ...object });
try {
	early();
} catch (e) {
	console.log("unset");
}
var later = [1];
function early() {
	[...later];
}
var getter = {
	get a() {
		console.log("getter");
		return 1;
	}
};
({ ...getter });
console.log("done");
