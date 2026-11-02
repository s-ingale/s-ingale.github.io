# Shubham Ingale’s journal

A Jekyll site hosted on GitHub Pages. Public prose is supplied by Shubham and preserved verbatim. Do not generate, rewrite, or correct journal content without his request.

## Add an entry

Create `_journal/<slug>.md` with YAML front matter containing `title` and `date` (YYYY-MM-DD), followed by the author's exact Markdown. Optional `description` is also author-supplied. Entries use the author’s supplied text. The post layout automatically places “Written by human hands” before the article title. Entries appear on the homepage newest first.

Name and authorship wording live in `_config.yml`. Styles and theme controls are in `assets/css/site.css` and `assets/js/main.js`. Homepage petals use `assets/js/petals.js`: gravity, quadratic drag, damped collisions, friction, and a viewport floor. The pile is held in memory and resets on page load. No external image or credit is used.

Light is the default theme. The explicit theme preference is stored locally when available. Petals animate without an on-page pause control. Reduced-motion preferences disable all animation.

GitHub Pages builds Jekyll from the repository. For a local build, install Ruby/Bundler, run `bundle install`, then `bundle exec jekyll serve`.
