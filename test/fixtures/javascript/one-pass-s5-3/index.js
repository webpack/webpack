var or = 0 || function () {};
var nullish = null ?? function () {};
var wrapped = void 0 ?? (() => 1);
var picked = !0 ? () => 1 : void 0;
var kept = 1 ? function () {} : 0;
var keyed = { [0 || (() => 1)]: 1 };
var bare = [0 || (() => 1)];
var assigned;
assigned = void 0 ?? class {};
function defaulted(value = !0 ? () => 1 : void 0) {
	return value.name;
}
var object = { value: null ?? (() => 1) };
class Field {
	value = !0 ? () => 1 : void 0;
}
console.log(or.name, nullish.name, wrapped.name, picked.name, kept.name, Object.keys(keyed).length, bare[0].name);
console.log(assigned.name, defaulted(), object.value.name, new Field().value.name);
