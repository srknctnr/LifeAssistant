## 2024-10-03 - Add aria-label to category input
**Learning:** Found a missing aria-label for an input element that adds new categories. In this app, many inputs are custom components that have standard labels, but inputs used inline (like for adding a category dynamically) can sometimes slip through without explicit a11y labeling.
**Action:** Always check inline inputs that toggle conditionally (like `adding` state) to ensure they have an `aria-label` or associated `<label>`.
