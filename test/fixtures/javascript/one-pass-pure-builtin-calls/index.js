// Dropped: a conversion that only returns a literal runs nothing.
String({ toString() { return "x"; } });
new Number({ valueOf() { return 1; } });
Symbol.for({ toString: () => "key" });
// Kept: the conversion logs, throws or is read as text.
String({ toString() { console.log("converted"); return "y"; } });
try {
	Number({ valueOf() { return 1n; } }) + 1;
} catch (error) {
	console.log(error.constructor.name);
}
console.log("" + { toString() { return "text"; } });
console.log(Symbol.for("shared") === Symbol.for("shared"));
