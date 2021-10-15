const {
	aaa,
	aaa: ccc,
	bbb
} = _DEFINE_.a;

const {
	a,
	...rest
} = _DEFINE_.b;

const {
	['a']: c,
} = _DEFINE_.c;

const {
	[Math.random()]: cc,
	b,
} = _DEFINE_.d;

const used = _USED_;
const expected = {
	a: ['aaa', 'bbb'],
	b: null,
	c: ['a'],
	d: null
};

Object.keys(expected).forEach(prop => {
	it(
		`should use correct set of properties for _DEFINE_.${prop}`,
		() => {
			if (used[prop] === null) {
				expect(used[prop]).toEqual(expected[prop])
			} else {
				expect(expected[prop] instanceof Array).toBe(true);
				expect(used[prop]).toEqual(
					expect.arrayContaining(expected[prop])
				)
			}
		}
	)
})
