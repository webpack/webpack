// A collection made and dropped runs only its arguments: it reads none past
// its first, and `void` gives it `undefined`.
var log = [];
new Set(void log.push("set first"), log.push("set extra"));
new Map(null, log.push("map extra"));
new WeakMap(undefined, log.push("weak map extra"));
new WeakSet(void 0, log.push("weak set extra"));
// A first argument it iterates, or a spread past it, keeps it.
try {
	new Set(log.push("iterated"));
} catch (error) {
	log.push(error.name);
}
new Set(null, ...[log.push("spread")]);
var kept = new Map(void log.push("kept"), log.push("kept extra"));
console.log(log, kept.size);
