const dep = { value: 1, alpha: 2, beta: 3, hoisted: 5 };
const key = "k";
const marker = { hit: 0 };
marker.hit += 1; // top-level side effect keeps this module unsplit

// Module-scope destructuring: every bound name must land in the scope set.
const { alpha } = dep;
const { beta: renamed = 4 } = dep;
const [first] = [dep.value];
const { value, ...others } = dep;
var { hoisted } = dep;

function helperFn(a) {
	return a;
}
class HelperClass {}

export const eager = "EAGER_VALUE_123";

// One pure function-expression initializer carrying every AST shape the split
// analyzer walks: member access, destructured params, a nested class with a
// computed method and a field, an arrow, a local var, and a catch binding.
export const shaped = function outer(x, { p, q: r }, [s], t = 1, ...rest) {
	const nested = dep[key];
	class Named {
		[key]() {
			return dep.value;
		}
		field = 2;
	}
	const ar = (m, n) => m + n;
	try {
		return new Named().field + nested + p + r + s + t + rest.length + ar(1, 2);
	} catch (e) {
		return e;
	}
};

// Anonymous default: its declaration id is rewritten by the export template.
export default function () {
	return (
		helperFn(hoisted + HelperClass.name.length + marker.hit) +
		alpha +
		renamed +
		first +
		value +
		Object.keys(others).length
	);
}
