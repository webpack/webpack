import data from './data.json';
import data2 from 'data:application/json,{"__proto__":{}}';
import data3 from './data1.json';
import data4 from 'data:application/json,{"a":"__proto__"}';

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
