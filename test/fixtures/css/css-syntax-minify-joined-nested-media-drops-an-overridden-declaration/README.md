two joined nested group rules drop the declaration the later one overrides

Two adjacent `@media` blocks with the same condition join into one. A
declaration the later block writes again overrides the earlier one, so the
join takes the earlier back, as a second pass would. An `!important` earlier
declaration still wins, and a nested rule between keeps both.
