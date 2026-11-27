// Every extend element here is invalid
interface Invalid extends (foo.bar), (foo).bar, foo[bar], foo?.bar, foo!.bar, foo(), import.meta {}
