export const red = [
	"#fff1f0",
	"#ffccc7",
	"#ffa39e",
	"#ff7875",
	"#ff4d4f",
	"#f5222d"
];
red.primary = red[5];

// Same pattern as @ant-design/colors — unused export must not leave
// `obj.primary = obj[5]` running after the array init is nullified.
export const redDark = [
	"#2a1215",
	"#431418",
	"#58181c",
	"#791a1f",
	"#a61d24",
	"#d32029"
];
redDark.primary = redDark[5];
