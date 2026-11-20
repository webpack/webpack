var x = 1n;
console.log(1n == 1, 1n === 1, 1n < 2, "1" == 1n, 2n > 1n, 1n == void 0);
console.log(1n !== null, -1n < -0n, 1n == "x", 1n < "x", 1n === 1n, 2n >= 3n);
console.log(x === 1n, 1n != x, (x = 2n) === 2n, x);
console.log(-1 !== -1n ? "PASS" : "FAIL");
