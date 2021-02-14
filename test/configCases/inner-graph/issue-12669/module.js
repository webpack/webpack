import * as tracing_1 from "@effect-ts/tracing-utils";
const fileName_1 = "(@effect-ts/core): _src/Option/operations.ts";
import * as O from "@effect-ts/system/Option";
import { makeAssociative } from "../Associative";
import { left, right } from "../Either";
import { pipe } from "../Function";
import { fold, fromAssociative, makeIdentity } from "../Identity";
import { makeOrd } from "../Ord";
import * as P from "../Prelude";
export function getEqual(E) {
	return {
		equals: y => x =>
			x === y ||
			(O.isNone(x)
				? O.isNone(y)
				: O.isNone(y)
				? false
				: E.equals(y.value)(x.value))
	};
}
export function getShow(S) {
	return {
		show: ma => (O.isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
	};
}
export const AssociativeEither = /*#__PURE__*/ P.instance({
	orElseEither: fb => fa =>
		fa._tag === "Some" ? O.some(left(fa.value)) : O.map_(fb(), right)
});
export const Covariant = /*#__PURE__*/ P.instance({
	map: O.map
});
export const Any = /*#__PURE__*/ P.instance({
	any: () => O.some({})
});
export const AssociativeFlatten = /*#__PURE__*/ P.instance({
	flatten: O.flatten
});
export const IdentityFlatten = /*#__PURE__*/ P.instance(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Any),
		AssociativeFlatten
	)
);
export const Monad = /*#__PURE__*/ P.instance(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Covariant),
		IdentityFlatten
	)
);
export const AssociativeBoth = /*#__PURE__*/ P.instance({
	both: O.zip
});
export const IdentityBoth = /*#__PURE__*/ P.instance(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Any),
		AssociativeBoth
	)
);
export const Applicative = /*#__PURE__*/ P.instance(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Covariant),
		IdentityBoth
	)
);
export const Extend = /*#__PURE__*/ P.instance({
	extend: O.extend
});
export const Foldable = /*#__PURE__*/ P.instance({
	reduce: (b, f) => fa => (O.isNone(fa) ? b : f(b, fa.value)),
	reduceRight: (b, f) => fa => (O.isNone(fa) ? b : f(fa.value, b)),
	foldMap: M => f => fa => (O.isNone(fa) ? M.identity : f(fa.value))
});
export const forEachF = /*#__PURE__*/ P.implementForEachF()(
	() => G => f => fa =>
		O.isNone(fa) ? P.succeedF(G)(O.none) : G.map(O.some)(f(fa.value))
);
export const ForEach = /*#__PURE__*/ P.instance(
	/*#__PURE__*/ Object.assign(/*#__PURE__*/ Object.assign({}, Covariant), {
		forEachF
	})
);
export const Fail = /*#__PURE__*/ P.instance({
	fail: () => O.none
});
/**
 * Returns `true` if `ma` contains `a`
 */

export function elem(E) {
	const el = elem_(E);
	return a => ma => el(ma, a);
}
/**
 * Returns `true` if `ma` contains `a`
 */

export function elem_(E) {
	return (ma, a) => (O.isNone(ma) ? false : E.equals(ma.value)(a));
}
/**
 * `Apply` Identity
 *
 * | x       | y       | combine(y)(x)      |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 */

export function getApplyIdentity(M) {
	return fromAssociative(getApplyAssociative(M))(O.none);
}
/**
 * `Apply` Associative
 *
 * | x       | y       | combine(y)(x)      |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 */

export function getApplyAssociative(S) {
	return makeAssociative(y => x =>
		O.isSome(x) && O.isSome(y) ? O.some(S.combine(y.value)(x.value)) : O.none
	);
}
/**
 * `Identity` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */

export function getLastIdentity() {
	return fromAssociative(getLastAssociative())(O.none);
}
/**
 * `Associative` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */

export function getLastAssociative() {
	return makeAssociative(y => x => (O.isNone(x) ? x : y));
}
/**
 * `Associative` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */

export function getFirstAssociative() {
	return makeAssociative(y => x => (O.isNone(x) ? y : x));
}
/**
 * `Identity` returning the left-most non-`None` value
 *
 * | x       | y       | combine(y)(x) |
 * | ------- | ------- | ------------- |
 * | none    | none    | none          |
 * | some(a) | none    | some(a)       |
 * | none    | some(a) | some(a)       |
 * | some(a) | some(b) | some(a)       |
 */

export function getFirstIdentity() {
	return fromAssociative(getFirstAssociative())(O.none);
}
export const getFirst = (...items) => fold(getFirstIdentity())(items);
export const getLast = (...items) => fold(getLastIdentity())(items);
/**
 * The `Ord` instance allows `Option` values to be compared with
 * `compare`, whenever there is an `Ord` instance for
 * the type the `Option` contains.
 *
 * `None` is considered to be less than any `Some` value.
 */

export function getOrd(_) {
	return makeOrd(getEqual(_).equals, y => x =>
		x === y
			? 0
			: O.isSome(x)
			? O.isSome(y)
				? _.compare(y.value)(x.value)
				: 1
			: -1
	);
}
export const filter = predicate => fa =>
	O.isNone(fa) ? O.none : predicate(fa.value) ? fa : O.none;
export const filterMap = f => ma => (O.isNone(ma) ? O.none : f(ma.value));
const defaultSeparate = {
	left: O.none,
	right: O.none
};
export function separate(ma) {
	const o = O.map_(ma, e => ({
		left: O.getLeft(e),
		right: O.getRight(e)
	}));
	return O.isNone(o) ? defaultSeparate : o.value;
}
export const partition = predicate => fa => ({
	left: filter(a => !predicate(a))(fa),
	right: filter(predicate)(fa)
});
export const partitionMap = f => fa => separate(O.map_(fa, f));
export const Filterable = /*#__PURE__*/ P.instance({
	filter,
	filterMap,
	partition,
	partitionMap
});
export const sequence = /*#__PURE__*/ P.sequenceF(ForEach);
export const separateF = /*#__PURE__*/ P.implementSeparateF()(
	_ => F => f => fa => {
		const o = O.map_(fa, a =>
			F.map(e => ({
				left: O.getLeft(e),
				right: O.getRight(e)
			}))(f(a))
		);
		return O.isNone(o)
			? P.succeedF(F)({
					left: O.none,
					right: O.none
			  })
			: o.value;
	}
);
export const compactF = /*#__PURE__*/ P.implementCompactF()(
	_ => F => f => fa => {
		return O.isNone(fa) ? P.succeedF(F)(O.none) : f(fa.value);
	}
);
export const Wiltable = /*#__PURE__*/ P.instance({
	separateF
});
export const Witherable = /*#__PURE__*/ P.instance({
	compactF
});
export const Compactable = /*#__PURE__*/ P.instance({
	compact: O.flatten,
	separate
});
export function getIdentity(A) {
	return makeIdentity(O.none, y => x =>
		O.isNone(x) ? y : O.isNone(y) ? x : O.some(A.combine(y.value)(x.value))
	);
}
export const alt = /*#__PURE__*/ P.orElseF(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Covariant),
		AssociativeEither
	)
);
export const gen = /*#__PURE__*/ P.genF(Monad);
export const bind = /*#__PURE__*/ P.bindF(Monad);
const do_ = /*#__PURE__*/ P.doF(Monad);
export { do_ as do };
export { branch as if, branch_ as if_ };
export const struct = /*#__PURE__*/ P.structF(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Monad),
		Applicative
	)
);
export const tuple = /*#__PURE__*/ P.tupleF(
	/*#__PURE__*/ Object.assign(
		/*#__PURE__*/ Object.assign({}, Monad),
		Applicative
	)
);
/**
 * Matchers
 */

export const {
	match,
	matchIn,
	matchMorph,
	matchTag,
	matchTagIn
} = /*#__PURE__*/ P.matchers(Covariant);
/**
 * Conditionals
 */

const branch = /*#__PURE__*/ P.conditionalF(Covariant);
const branch_ = /*#__PURE__*/ P.conditionalF_(Covariant);
