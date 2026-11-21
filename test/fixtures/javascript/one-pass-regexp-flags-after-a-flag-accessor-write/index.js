var before = [/x/gi.flags, "" + /x/gim, /x/g.global].join(" ");
delete RegExp.prototype.global;
delete RegExp.prototype["unicode"];
function dropIgnoreCase() {
	delete RegExp.prototype.ignoreCase;
}
dropIgnoreCase();
console.log(before);
console.log(JSON.stringify(/x/g.flags), /x/gu.flags, /x/gim.flags);
console.log(String(/x/g), "" + /x/gi, /x/gm + "", /x/gu.toString());
console.log(/x/g.global, /x/i.ignoreCase, /x/m.multiline, /x/.source);
