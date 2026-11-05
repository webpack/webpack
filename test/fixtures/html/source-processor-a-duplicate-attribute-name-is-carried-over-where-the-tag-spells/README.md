is carried over where the tag spells a foreign delimiter

`{%` / `%}` tokenize as attribute names, so `{% endif %}` repeats both

and §13.2.5.33 drops them. What the print may not do is write that drop

out: the bytes between the names it kept are the template's, so they are

copied from the source rather than rebuilt from the attributes.
