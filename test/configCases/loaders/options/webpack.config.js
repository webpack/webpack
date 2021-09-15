/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	module: {
		rules: [
			{
				test: /a\.js$/,
				loader: "./loader",
				options: {
					arg: true,
					arg1: null,
					arg2: undefined,
					arg3: 1234567890,
					arg4: "string",
					arg5: [1, 2, 3],
					arg6: { foo: "value", bar: { baz: "other-value" } }
				}
			},
			{
				test: /b\.js$/,
				loader: "./loader-1",
				options: {
					arg: true,
					arg1: null,
					arg2: undefined,
					arg3: 1234567890,
					arg4: "string",
					arg5: [1, 2, 3],
					arg6: { foo: "value", bar: { baz: "other-value" } }
				}
			},
			{
				test: /c\.js$/,
				loader: "./loader-1",
				options: JSON.stringify({
					arg: true,
					arg1: null,
					arg2: undefined,
					arg3: 1234567890,
					arg4: "string",
					arg5: [1, 2, 3],
					arg6: { foo: "value", bar: { baz: "other-value" } }
				})
			},
			{
				test: /d\.js$/,
				loader: "./loader-1",
				options: "arg4=text"
			},
			{
				test: /d\.js$/,
				loader: "./loader",
				options: ""
			},
			{
				test: /f\.js$/,
				loader: "./loader",
				options: "name=cheesecake&slices=8&delicious&warm=false"
			},
			{
				test: /g\.js$/,
				loader: "./loader",
				options: "%3d=%3D"
			},
			{
				test: /h\.js$/,
				loader: "./loader",
				options: "foo=bar"
			},
			{
				test: /i\.js$/,
				loader: "./loader",
				options: `${JSON.stringify({
					foo: "bar"
				})}`
			},
			{
				test: /error1\.js$/,
				loader: "./loader-1",
				options: {
					arg6: { foo: "value", bar: { baz: 42 } }
				}
			},
			{
				test: /error2\.js$/,
				loader: "./loader-2",
				options: {
					arg: false
				}
			}
		]
	}
};
