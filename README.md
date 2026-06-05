# s-ingale.github.io

My personal site → **https://s-ingale.github.io**

Two sections:

| Section | Folder | URL |
|---|---|---|
| Data Science & AI | `_tech/` | `/tech/<name>/` |
| Philosophy & Thinking | `_philosophy/` | `/philosophy/<name>/` |

## ✍️ Add a new post

1. Create a markdown file in the right folder, e.g. `_tech/my-new-post.md`.
2. Start it with this front-matter block (the YAML at the top):

   ```yaml
   ---
   title: "My New Post"
   description: "One line shown on the home-page card."
   date: 2026-06-05
   ---
   ```
3. Write your post in markdown below it.
4. Commit and push:

   ```bash
   git add .
   git commit -m "Add: my new post"
   git push
   ```

GitHub Pages rebuilds and deploys automatically — no build step, no Action to
run. The new card appears on the home page (newest first) within a minute or two.

The filename becomes the URL slug, so `my-new-post.md` → `/tech/my-new-post/`.

## 🛠️ Change site-wide things

Open `_config.yml` to edit your **name**, **tagline**, **social links**, and the
two **section** labels/colors. Replace `assets/img/profile.jpg` with your photo.

## 👀 Preview locally (optional)

You never *need* this, but if you want to see changes before pushing:

```bash
bundle install
bundle exec jekyll serve   # → http://localhost:4000
```
