const {
	aaa,
	aaa: ccc,
	bbb
} = _DEFINE_._0;

const {
	a,
	...rest
} = _DEFINE_._1;

const {
	['a']: c,
} = _DEFINE_._2;

const {
	[Math.random()]: cc,
	b,
} = _DEFINE_._3;

const {} = _DEFINE_._4;
const z = _DEFINE_._5;
const {l} = {m} = {k} = j = _DEFINE_._6;
const h = {g} = _DEFINE_._7;
const {f} = {o, o: ii, i} = _DEFINE_._8;

const used = _USED_;
const expected = {
	_0: ['aaa', 'bbb'],
	_1: null,
	_2: ['a'],
	_3: null,
	_4: [],
	_5: null,
	_6: null,
	_7: null,
	_8: ['f', 'o', 'i'],
};

Object.keys(expected).forEach(prop =>
	it(
		`should use correct set of properties for _DEFINE_.${prop}`,
		() => {
			if (used[prop] === null) {
				expect(used[prop]).toEqual(expected[prop]);
			} else {
				expect(expected[prop] instanceof Array).toBe(true);
				expect(used[prop]).toEqual(
					expect.arrayContaining(expected[prop])
				);
			}
		}
	)
);
