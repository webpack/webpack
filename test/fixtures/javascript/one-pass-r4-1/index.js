export function keys(o) {
	const KEY = "_foo";
	const NUM = 1;
	const DASH = "a-b";
	const { [KEY]: picked } = o;
	return [
		{ [KEY]: o[KEY], k: picked },
		class {
			[KEY]() {
				return o[KEY];
			}
			static [KEY] = 1;
		},
		o[NUM],
		o[NUM],
		o[DASH],
		o[DASH],
		{ [DASH]: 1 },
		{ [DASH]: 2 },
		o.x
	];
}
export function plain(o) {
	const NAME = "_bar";
	return [o[NAME], o[NAME], { [o.x]: NAME, k: NAME }, NAME.big];
}
