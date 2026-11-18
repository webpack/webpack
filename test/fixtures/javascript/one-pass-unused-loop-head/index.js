var o = { x: 1 };
function f(n) {
	console.log("f", n);
	return n;
}
function labeled() {
	L: for (var b = f(1); !1; ) continue L;
}
function listed() {
	for (var b = f(2), c = 3; 0; );
}
function held() {
	for (var d = [f(4)]; 0; );
}
function looping(i) {
	for (var a = f(7); i < 2; i++) console.log(i);
	for (let a = f(8); i < 4; i++) console.log(i);
	for (var g = f("x" in o); i < 5; i++) console.log(i);
}
function kept() {
	if (o) for (var m = f(12); 0; ) continue;
	for (let n = f(13); 0; );
}
labeled();
listed();
held();
looping(0);
kept();
labeled();
listed();
held();
looping(3);
kept();
