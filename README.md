# Shubham Ingale’s journal

A Jekyll site hosted on GitHub Pages. Public prose is supplied by Shubham and preserved verbatim. Do not generate, rewrite, or correct journal content without his request.

## Add an entry

Create `_journal/<slug>.md` with YAML front matter containing `title` and `date` (YYYY-MM-DD), followed by the author's exact Markdown. Optional `description` is also author-supplied. No sample entries are published. The post layout automatically places “Written by human hands” before the article title. Entries appear on the homepage newest first.

Name, introduction, and authorship wording live in `_config.yml`. The original blossom illustration is `_includes/tree.svg`. Styles and browser controls are in `assets/css/site.css` and `assets/js/main.js`.

Light is the default theme. Explicit theme and animation preferences are stored locally when available. Reduced-motion preferences disable all animation.

GitHub Pages builds Jekyll from the repository. For a local build, install Ruby/Bundler, run `bundle install`, then `bundle exec jekyll serve`.
