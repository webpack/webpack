// A template substituting nothing reads `undefined` past its end, as a string does.
var x = "q";
console.log(`ab`[5], `ab`[1], `a${x}`[9], `abc`["7"], `é`[1], `ab`.p);
