// A function a `let` or `const` holds, read once in a function declaration,
// moves there only where that declaration is called after the declarator:
// called before, the read throws in the dead zone.
var log = [];
try {
	early();
} catch (error) {
	log.push(error.name);
}
let first = function () {
	log.push("first");
};
function early() {
	first();
}
early();
try {
	arrow();
} catch (error) {
	log.push(error.name);
}
const second = () => {
	log.push("second");
};
function arrow() {
	second();
}
arrow();
function chosen(key) {
	switch (key) {
		case 0:
			let third = function () {
				log.push("third");
			};
			function inCase() {
				third();
			}
		// falls through
		case 1:
			try {
				inCase();
			} catch (error) {
				log.push(error.name);
			}
	}
}
chosen(1);
chosen(0);
// Moved: called only after the declarator.
const fourth = function () {
	log.push("fourth");
};
function late() {
	fourth();
}
late();
console.log(log.join());
