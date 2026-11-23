// A `let` with no value nothing sets, read only after its declaration in its
// own function, is `undefined` there, as such a `var` is.
{
	let unset;
	if (!unset) console.log("block");
	console.log("after");
}
function top() {
	let unset;
	console.log(unset);
}
top();
// A read before it, or in a function or class that may run first, is in
// its dead zone, which throws: those keep the name.
function before() {
	try {
		console.log(early);
	} catch (error) {
		console.log("dead zone");
	}
	let early;
	if (!early) console.log("set");
}
before();
function hoisted() {
	read();
	let late;
	function read() {
		try {
			console.log(!late);
		} catch (error) {
			console.log("dead zone");
		}
	}
	if (!late) console.log("hoisted");
}
hoisted();
function cases(value) {
	switch (value) {
		case 0:
			let shared;
		case 1:
			try {
				console.log(!shared);
			} catch (error) {
				console.log("dead zone");
			}
	}
}
cases(1);
cases(0);
// `!` of `undefined` is true; of a local whose declaration stays it prints
// the read, as the declaration keeps it.
function negated() {
	if (!void 0) console.log("void");
	for (var i = 0; i < 1; i++) {
		var kept;
		console.log(!kept);
	}
}
negated();
