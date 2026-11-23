// A declarator set to a write of a name only written takes the value that
// write sets, which its reads may print.
var log = [];
var first,
	second = (first = "PASS");
log.push(second);
var unread;
var both = (unread = 1);
log.push(both);
// Kept: the name written is read too, or the write sets a member.
var read,
	other = (read = 2);
log.push(other, read);
var holder = {};
var member = (holder.value = 3);
log.push(member, holder.value);
var later,
	then = (later = 4);
later++;
log.push(then);
(function () {
	"use strict";
	var inner,
		value = (inner = 5);
	log.push(value);
})();
console.log(log.join());
