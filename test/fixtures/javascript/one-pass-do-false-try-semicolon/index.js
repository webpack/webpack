var n = 0;
function g() {
	console.log("g", typeof n === "number" ? n : n());
}
do {
	try {
		n++;
	} finally {
		n++;
	}
} while (0);
g();
do {
	try {
		n = function () {
			return 3;
		};
	} catch (e) {}
} while (false);
(g)();
for (var i = 0; i < 2; i++) {
	do {
		try {
			n = i;
		} finally {
			g();
		}
	} while (0);
	g();
}
console.log(typeof n);
