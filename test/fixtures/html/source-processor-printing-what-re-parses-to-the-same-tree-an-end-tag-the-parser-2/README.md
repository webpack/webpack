keeps `</caption>` before anything but a table part

§13.1.2.4 lets it go unless whitespace or a comment follows, but "in

caption" only ends at a table part: a `<script>` beside it, which the

table's content model allows, would go inside it.
