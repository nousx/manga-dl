# Design system

Register: product. Owner-confirmed direction: quiet, sharp, list-first.

The owner translates manga in daylight and in a dim room at night. Follow the
Windows light/dark preference with equally complete themes; never fetch assets.

- Restrained OKLCH blue-tinted neutrals, blue for actions/current navigation,
  green for completion, amber for incomplete data, red for failures. Every status
  also has a Thai label. No gradients, decorative animation, or metric cards.
- Leelawadee UI, Segoe UI, Tahoma, sans-serif. 14px body, 1.65 line height,
  22px page headings, 20px series titles, 12px metadata. Tabular progress numbers.
- Persistent 196px sidebar; settings are an inline disclosure on every page.
  Full-width chapter rows above a compact activity log. History expands inline.
- Visible 2px focus rings, native controls and disclosure keyboard behavior.
  Reduced motion honored. Long rows use content visibility to skip offscreen paint.
- Original icon: three manga panels and a descending arrow in the fourth panel.
  Source: resources/mark.svg. Regenerate with npm run icons (Windows WPF).
