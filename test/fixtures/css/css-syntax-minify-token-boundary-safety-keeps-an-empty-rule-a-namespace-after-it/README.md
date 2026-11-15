keeps an empty rule a `@namespace` after it is made inert by

CSS Namespaces 3 §3.1: a rule the engine keeps ends the run a

`@namespace` may stand in. Dropping that rule would carry the dead

`@namespace` back to the head, where the engine honours it.

An unknown at-rule is thrown away, so it is not what ended the run — the

`@supports` after it is, and it has to stay for that reason too.

Past the first rule every engine keeps, an empty one drops as before.
