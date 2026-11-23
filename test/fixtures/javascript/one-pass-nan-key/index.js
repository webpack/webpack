var obj = { undefined: 1, NaN: 2, Infinity: 3, "-Infinity": 4, null: 5 };
console.log(obj[void 0], obj[0 / 0], obj[NaN], obj["NaN"], obj[1 / 0], obj[null]);
console.log(obj.NaN, 0 / 0, [0 / 0].indexOf(NaN));
