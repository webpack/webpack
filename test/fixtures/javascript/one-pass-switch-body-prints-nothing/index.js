var log = [];
var count = 0;
function effect() {
	log.push("effect");
}
function chosen(x) {
	if (x) effect();
	else
		B: switch (1) {
			case 2:
				effect();
		}
	log.push("chosen");
}
function looped() {
	for (; count < 2; count++)
		C: switch (1) {
			case 2:
				effect();
		}
	while (count++ < 4)
		switch (1) {
			case 2:
				effect();
		}
	log.push(count);
}
chosen(0);
chosen(1);
looped();
console.log(log.join());
