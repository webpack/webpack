function identity<T>(value: T): T {
	return value;
}
function constrained<T extends object, K extends keyof T = keyof T>(obj: T, key: K): T[K] {
	return obj[key];
}
function constParameter<const T extends readonly unknown[]>(items: T): T {
	return items;
}
class Box<in out T> {
	value<U>(mapper: (value: T) => U): U {
		return mapper(this.held);
	}
}
const anonymous = function <T>(x: T) {
	return x;
};
