// An arrow's body of directives only says nothing: it prints empty.
var empty = () => {
	"use strict";
};
var directives = (a, b) => {
	"use strict";
	"other";
};
// So does one whose other statements print nothing.
var unused = () => {
	"use strict";
	var dropped = 1;
};
// One with a statement keeps it, and a function's, which has a `caller`.
var kept = () => {
	"use strict";
	return typeof this;
};
var named = function () {
	"use strict";
};
console.log(empty(), directives.length, kept(), named(), named.length, unused());
try {
	console.log(empty.caller);
} catch (error) {
	console.log(error.name);
}
