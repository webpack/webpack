import { obj1 }  from './module1';
import * as m_1 from './module1';
import * as m_2 from './module2';
import * as m_3 from './module3';
import data from "./data";

const regexEscape = require("../../../helpers/regexEscape");
const {
	expectSourceToContain,
	expectSourceToMatch
} = require("../../../helpers/expectSource");

// "@" marks a mangled export accessor name. Its exact value depends on the
// mangleExports "size" ranking (and can differ between cached and non-cached
// builds), so match it as `\w+` while still pinning the accessor *form*.
const re = (tpl) => tpl.split("@").map(regexEscape).join("\\w+");

// It's important to preserve the same accessor syntax (quotes vs. dot notatation) after the actual export variable.
// Else, minifiers such as Closure Compiler will not be able to minify correctly in ADVANCED mode.

it("should use/preserve accessor form for import object and namespaces", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8").toString();

	// Reference the imports to generate uses in the source.

	const f = false;
	if (f) {
		const x1 = m_1;
		const x2 = obj1;

		const z1 = obj1["plants"];
		const z2 = obj1["funcs"]();
		const z3 = m_1["obj1"]["pots"];
		const z4 = m_1["obj1"]["subs"]();

		const a = m_2["m_1"].obj1["flip"].flap;
		const b = m_2["m_1"]["obj1"].zip["zap"];
		const c = m_2.m_1.obj1["ding"].dong();
		const d = m_2.m_1["obj1"].sing["song"]();

		const aa = m_3["m_2"].m_1["obj1"]["zoom"];

		const bb = obj1.up.down?.left.right;

		const ww = require('./module1').obj1["bing"]?.bang;
		const xx = require('./module1').obj1["pip"].pop();
		const yy = require('./module3')["m_2"]["m_1"]["obj1"]["tip"].top();

		data.nested.object3["unknownProperty"].depth = "deep";

		(obj1)["aaa"].bbb;
		(m_1.obj1)["ccc"].ddd;
		(obj1["eee"]).fff;
		(m_1.obj1["ggg"]).hhh;
		(((m_1).obj1)["iii"]).jjj;
	}

	/************ DO NOT MATCH BELOW THIS LINE ************/

	// Imported objects and import namespaces should use dot notation.  Any references to the properties of exports
	// should be preserved as either quotes or dot notation, depending on the original source.
	// `obj1` is mangled here (its namespace escapes via `const x1 = m_1`, which is rendered as a decoupled
	// namespace object that keeps the original names); the mangled accessor name is matched as `\w+` below, but
	// the accessor *form* (dot vs. quotes) is still pinned.
	// The wrapper accessor call is parenthesized so `new`/call positions keep binding to the export rather than
	// to the accessor; the original source's own parens are preserved around it.

	expectSourceToContain(source, 'const x1 = module1_namespaceObject;');
	expectSourceToMatch(source, re('const x2 = (module1_namespaceFn().@);'));

	expectSourceToMatch(source, re('const z1 = (module1_namespaceFn().@)["plants"];'));
	expectSourceToMatch(source, re('const z2 = (module1_namespaceFn().@)["funcs"]();'));
	expectSourceToMatch(source, re('const z3 = (module1_namespaceFn().@)["pots"];'));
	expectSourceToMatch(source, re('const z4 = (module1_namespaceFn().@)["subs"]();'));

	expectSourceToMatch(source, re('const a = (module1_namespaceFn().@)["flip"].flap;'));
	expectSourceToMatch(source, re('const b = (module1_namespaceFn().@).zip["zap"];'));
	expectSourceToMatch(source, re('const c = (module1_namespaceFn().@)["ding"].dong();'));
	expectSourceToMatch(source, re('const d = (module1_namespaceFn().@).sing["song"]();'));

	expectSourceToMatch(source, re('const aa = (module1_namespaceFn().@)["zoom"];'));

	expectSourceToMatch(source, re('const bb = (module1_namespaceFn().@).up.down?.left.right;'));

	expectSourceToMatch(source, re('const ww = (module1_namespaceFn().@)["bing"]?.bang;'));
	expectSourceToMatch(source, re('const xx = (module1_namespaceFn().@)["pip"].pop();'));
	expectSourceToMatch(source, re('const yy = (module3_namespaceFn().@.@.@)["tip"].top();'));

	expectSourceToContain(source, 'data_namespaceObject.a.a["unknownProperty"].depth = "deep";');

	expectSourceToMatch(source, re('((module1_namespaceFn().@))["aaa"].bbb;'));
	expectSourceToMatch(source, re('((module1_namespaceFn().@))["ccc"].ddd;'));
	expectSourceToMatch(source, re('((module1_namespaceFn().@)["eee"]).fff;'));
	expectSourceToMatch(source, re('((module1_namespaceFn().@)["ggg"]).hhh;'));
	expectSourceToMatch(source, re('(((module1_namespaceFn().@))["iii"]).jjj;'));
});
