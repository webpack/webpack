// A class read only by one write of its own key goes, the write running
// only its value.
var log = [];
class Unused {}
Unused.staticProp = log.push("value");
// Read elsewhere, defining what the key names, or extending, it stays.
class Read {}
Read.p = 1;
console.log(Read.p);
class Getter {
	static get danger() {
		return "getter";
	}
}
try {
	Getter.danger = "";
} catch (error) {
	log.push(error.name);
}
console.log(log.join(), Getter.danger);
