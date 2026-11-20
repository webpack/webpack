var yes = true;
var no = false;
console.log(true.toString, false.valueOf, true["constructor"] === Boolean);
console.log(yes.valueOf(), no.valueOf(), (true).constructor.name);
console.log(String(yes ** 2), typeof new Boolean(yes));
