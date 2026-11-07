import data from './data.json';
import data2 from 'data:application/json,{"__proto__":{}}';
import data3 from './data1.json';
import data4 from 'data:application/json,{"a":"__proto__"}';
import data5 from './data2.json';
import data6 from './data3.json';

it("should preserves `__proto__` properties", () => {
	expect(Object.getPrototypeOf(data) === Object.getPrototypeOf({})).toBe(true);
	expect(Object.getPrototypeOf(data2) === Object.getPrototypeOf({})).toBe(true);
	expect(Object.getPrototypeOf(data3) === Object.getPrototypeOf({})).toBe(true);
	expect(Object.getPrototypeOf(data4) === Object.getPrototypeOf({})).toBe(true);
	expect(data).toMatchObject({["__proto__"]: {}});
	expect(data2).toMatchObject({["__proto__"]: {}});
	expect(data3.__proto__.fail).toBe(true);
	expect(data4.a).toBe("__proto__");
});

it("should keep a key that contains a quoted `__proto__`", () => {
	expect(Object.keys(data5)).toEqual(['"__proto__']);
	expect(data5['"__proto__']).toBe(1);
	expect(Object.keys(data6)).toEqual(['a"__proto__"']);
	expect(data6['a"__proto__"']).toBe(2);
});
