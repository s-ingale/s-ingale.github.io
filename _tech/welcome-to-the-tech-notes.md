---
title: "Welcome to the Tech Notes"
description: "A quick tour of how I'll write about data science and AI here."
date: 2026-06-05
---

This is the first entry in the **Data Science & AI** section. Everything you
need to publish a new one is a markdown file dropped into the `_tech/` folder.

## How posts work

Each file starts with a small block of YAML at the very top — the
*front matter* — that powers the cards on the home page:

```yaml
---
title: "Your title"
description: "One line that shows under the title."
date: 2026-06-05
---
```

Below that, write normal markdown. Inline code like `np.mean(x)` is styled, and
fenced code blocks get syntax highlighting:

```python
import numpy as np

def softmax(x):
    e = np.exp(x - x.max())
    return e / e.sum()
```

That's it. Save, push, and GitHub rebuilds the site for you.
