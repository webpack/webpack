// A call printing as the postfix update it returns takes no parentheses.
var b = 1;
function g1() { return b++; } console.log(g1() + 1);
function g2() { return b++; } console.log(1 + g2());
function g3() { return b++; } console.log(-g3());
function g4() { return b++; } console.log(g4() ** 2);
function g5() { return b++; } console.log(typeof g5());
function g6() { return b++; } console.log(String(g6()).length);
function g7() { return b++; } console.log(g7().toString());
function g8() { return b--; } console.log(2 - g8());
function g9() { return b--; } console.log(g9() || 7, b);
function g10() { return b++; } var q = g10() ? "t" : "f"; console.log(q, b);
function g11() { return b--; } console.log(1 - -g11());
var a = 0;
function f() {
	return a++;
}
f() ? (a += 2) : (a += 4);
console.log(a);
