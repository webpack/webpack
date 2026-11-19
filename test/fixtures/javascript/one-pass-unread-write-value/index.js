function run(condition) {
	var unread;
	unread = !!condition.flag;
	unread = !condition.flag;
	unread = condition.flag ? 1 : 0;
	unread = console.log("checked") ? !0 : !1;
	return condition;
}
console.log(run({ flag: Math.random() < 2 }).flag);
