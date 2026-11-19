// An exported name is a live binding: its reads keep the name.
var data = [];
var a = 1;
data.push(a);
a = 2;
data.push(a);
var b = 3;
b = 4;
console.log(data.join(), b);
export { a, data };
export default b;
