function g() {
	console.log("g");
}
if ((g(), "0b1") != 1) console.log("ne");
else console.log("eq");
console.log((g(), "0o7") == 7 ? "y" : "n");
console.log((g(), "0b1") < 2 && "lt");
console.log((g(), "0b1") + 1 ? "joined" : "empty");
console.log((g(), "0b1") === 1 ? "s" : "t");
