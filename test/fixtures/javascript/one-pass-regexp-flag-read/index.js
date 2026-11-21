// A regular expression literal's third-edition flags read as booleans.
console.log(/a/g.global, /a/i.ignoreCase, /a/m.multiline, /a/.global);
console.log(/a/g["global"], !/a/.global, /a/g.global ? 1 : 2);
console.log(/a/g.global.toString(), typeof /a/i.ignoreCase);
// A later edition's flag, or a name's, stays a read.
console.log(/a/y.sticky, /a/g.flags);
var re = /a/g;
console.log(re.global);
