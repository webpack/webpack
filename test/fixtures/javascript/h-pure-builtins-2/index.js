// Each may throw: a prototype that is no object, a number in a BigInt array,
// a BigInt converted by `ToNumber`, an escape the `u` flag rejects.
Object.create(1);
Object.create(10n);
Float16Array.of();
Number.parseInt("1", 10n);
BigInt64Array.of(1);
parseInt("1", 10n);
isNaN(10n);
RegExp(/\-/, "u");
RegExp(/a/g, "gg");
Math.random(...a);
RegExp.prototype.flags = 1;
RegExp(/a/);
