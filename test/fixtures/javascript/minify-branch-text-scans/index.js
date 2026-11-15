// A branch printed into `?:` is scanned for a comma outside brackets, past
// strings, templates, regular expressions and comments.
if (a) b(`x${c}y${d}`, e); else f();
if (a) b(`x${{}.p}`, e); else f();
if (a) b(/,[/\]]\//g, e); else f();
if (a) b(x++ / 2, e); else f();
if (a) b(x.y / 2, e); else f();
if (a) b(g() / 2, e); else f();
if (a) for (b in /x/) b(c, e); else f();
if (a) b(typeof /x/, e); else f();
if (a) b(++x, e); else f();
if (a) b("s,t" + c); else f();
if (a) b(/* c */ c, e); else f();
if (a) b(c, // d
	e); else f();
// The nullish form parenthesizes what may bind looser than `??`.
if (x == null) y("a,b", 'c' + "]");
if (x == null) y(`t`);
if (x == null) y([c, d]);
if (x == null) y(c ? d : e);
if (x == null) y = 1;
if (x == null) { y(); z(); }
if (a) b("it's", e); else f();
if (a) b(function () { if (c) /x/.exec(d); }, e); else f();
if (a) ({ p: b(), q: c() }); else f();
if (a) [b(), c()]; else f();
// A sequence test whose last value negates prints bare, its `!` dropped.
x = (a(), !b) ? c : d;
x = (a("p,q"), [e, f], !b) ? c : d;
x = (a(`p`), !b) ? c : d;
x = (a(), ! --b) ? c : d;
(a(), !b) ? c() : d();
function r() { return (a("p,q"), [e, f], !b) ? c : d; }
function s() { return (a(), ! --b) ? c : d; }
if (x == null) y("${p}", "\"");
