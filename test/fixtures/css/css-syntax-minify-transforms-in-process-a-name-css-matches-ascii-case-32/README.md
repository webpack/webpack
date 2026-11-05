a name CSS matches ASCII case-insensitively

Written the shortest way first: the escape spells an `O`.

A type selector is case-sensitive in XML, where `linearGradient` is

its own element.

HTML matches an attribute name case-insensitively, XML does not, and

an attribute's value is case-sensitive in both.

A style query asks whether a custom property holds the token stream

written here, which is read as written.

`@charset` names the encoding the source was read in, and what is written

out is UTF-8 whatever it said.

An engine reads only the literal `@charset "` (CSS Syntax 3 §3.2), so a

cased rule — which a block makes no charset rule anyway — keeps its bytes.

Both are the same declaration however they are spelled, so a rule an

identical later sibling repeats is dead whichever way each spells it.

Both spell one property, so the later rule is read as the override it

is rather than as another property.

A property whose grammar is keywords alone claims no name of the

author's, so a top-level identifier in one of its values is a keyword.

A vendor spelling is read as the property it spells.

Each of these grammars takes a name of the author's somewhere, so an

identifier in one may be that name.

A call's arguments follow the function's grammar, not the property's.

The engine hands a pending-substitution value back as its tokens were

written, so nothing inside one is rewritten.

The eleven transforms and three units `mdn-data` spells with a capital

keep that spelling, which is what every other tool writes.

The canonical spelling repairs a name that was shouted; one already written in

a single case is left alone, since the bytes are the same either way and

reading the table for every unit costs more than the spelling is worth.

Until its substitution resolves the engine keeps the value as the tokens

it was written as, so a folded name there is a value the CSSOM never

reports — and two spellings of one call stop being one declaration.

An `@font-feature-values` sub-rule names feature values, which are

`<custom-ident>`s: folding one makes two distinct entries collide.
