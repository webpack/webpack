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
class Setter {
	static set value(value) {
		log.push(value);
	}
}
Setter.value = "stored";
// Before the class is made, the write throws.
try {
	Early.p = 1;
	class Early {}
} catch (error) {
	log.push(error.name);
}
// An `eval` may read what the store sets.
function evaluated() {
	class Read {}
	Read.x = "evaluated";
	return eval("Read.x");
}
log.push(evaluated());
// A setter `Function.prototype` holds runs for a class lacking the key.
Object.defineProperty(Function.prototype, "inherited", {
	set(value) {
		log.push(value);
	},
	configurable: true
});
class Inherits {}
Inherits.inherited = "inherited";
delete Function.prototype.inherited;
console.log(log.join(), Getter.danger);
