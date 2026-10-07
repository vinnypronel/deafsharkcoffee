# Deaf Shark Footer Link Hover Effect

Use this pattern to recreate the footer effect exactly: the words move 2px to the right, brighten, and a gold underline grows smoothly from left to right.

## HTML

```html
<ul class="footer-links-demo">
  <li><a href="/menu">Menu</a></li>
  <li><a href="/about">About</a></li>
</ul>
```

## CSS

```css
:root {
  --paper: #fffaf3;
  --gold: #b7823d;
}

.footer-links-demo {
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-links-demo a {
  position: relative;
  display: inline-block;
  padding: 3px 0;
  color: rgba(255, 250, 243, 0.65);
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.footer-links-demo a::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -4px;
  left: 0;
  height: 1px;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.24s ease;
}

.footer-links-demo a:hover,
.footer-links-demo a:focus-visible {
  color: var(--paper);
  transform: translateX(2px);
}

.footer-links-demo a:hover::after,
.footer-links-demo a:focus-visible::after {
  transform: scaleX(1);
}
```

## Important details

- Keep `display: inline-block`; otherwise the horizontal transform may not behave correctly.
- The underline is an `::after` pseudo-element, not `text-decoration`.
- `transform-origin: left center` makes the underline grow from left to right.
- Include `:focus-visible` so keyboard users receive the same effect.
- Deaf Shark uses `0.2s` for the text and `0.24s` for the underline.
