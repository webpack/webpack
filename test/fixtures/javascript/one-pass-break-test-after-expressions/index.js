var log = [];
var i = 0;
for (; i < 5; i++) {
	log.push(i);
	if (i == 3) break;
	if (i == 1) continue;
	log.push("r" + i);
}
console.log(log.join());
var items = [3, 2, 1, 0, 5];
var item;
var doubled = [];
while (items.length) {
	item = items.pop();
	log.push(item);
	if (!item) break;
	doubled.push(item * 2);
}
console.log(doubled.join(), log.join());
var sum = 0;
for (var j = 0; j < 4; j++) {
	(sum += j), (sum *= 2);
	if (sum > 10) break;
	else sum++;
}
console.log(sum, j);
function* steps() {
	var k = 0;
	for (;;) {
		yield k;
		if (k++ > 2) break;
	}
}
console.log(Array.from(steps()).join());
var outer = "outer";
var seen = [];
for (var n = 0; n < 2; n++) {
	try {
		seen.push(outer);
	} catch (error) {
		seen.push("dead zone");
	}
	if (n) break;
	let outer = "inner";
	seen.push(outer);
}
console.log(seen.join());
var m = 0;
for (;;) {
	m++;
	m ? 1 : 2;
	if (m > 2) break;
	console.log("m", m);
}
