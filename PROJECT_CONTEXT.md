# Deaf Shark Coffee Website and Ordering Demo

## Project handoff context

This document describes the current product direction, completed implementation, technical architecture, known assumptions, and recommended next steps. It is intended to let another developer or AI continue the project without needing the original conversation.

Last updated: August 22, 2026

## August 21 launch-scope decision

- Deaf Shark will continue using its existing Quantic POS at launch; this project is not replacing the register software.
- The photographed register is a SUNMI D3 Pro.
- Online orders must enter Quantic for launch and route prepared drinks to the front coffee KDS and food to the kitchen KDS.
- A custom Deaf Shark POS/register interface is a future phase and is not required for the September 1 launch.
- A custom staff order-preparation dashboard/KDS is also future work. The admin area may retain order history and diagnostic/fallback views, but staff should not need it to prepare normal launch-day orders.
- The required launch path is: Deaf Shark website -> Quantic -> drink line items on the front coffee preparation screen and food line items on the kitchen preparation screen.
- Mixed website orders must remain one customer order and payment while Quantic routes each line item to the correct preparation station.
- Until Quantic confirms an approved API or embedded-eCommerce path, the custom dashboard remains a fallback/testing monitor rather than the intended production order system.
- The existing Quantic problem where some register items reach a preparation screen and other items do not is a separate configuration/support issue to diagnose before launch.
- Cart and stored order items now carry an authoritative preparation station: `COFFEE`, `KITCHEN`, or `RETAIL`.

## Quick links

- Private live demo: https://deaf-shark-coffee-demo.darweez.chatgpt.site
- Original business website: https://www.deafsharkcoffee.com
- Local project folder: `C:\Users\vinny\OneDrive\Desktop\Deaf-Shark-Coffee`
- Sites project ID: `appgprj_6a7fb51363288191a3ebf7da24aadb21`
- Main branch: `main`

Do not expose temporary repository credentials, deployment tokens, or authentication headers. None are stored in this document.

## The business

Deaf Shark Coffee is a local coffee shop at:

- 900 Green Lane
- Union, NJ 07083
- Phone: (908) 481-8884

Known brand and business facts:

- The coffee is connected to El Salvador.
- Beans are roasted in Union, New Jersey.
- The shop is veteran owned.
- Ocean Blend is a medium roast sold in 12 oz bags.
- The current public website is mostly informational and does not have a complete online menu or ordering workflow.
- The business currently appears to focus on in-store purchases and pickup.
- Delivery is not part of the first release.
- DoorDash and other delivery platform integrations may be considered later.

Some origin details currently used in the demo came from existing business materials and should be verified before production:

- Finca Montevideo
- Red Bourbon
- Washed process
- Single-origin language

## Product vision

The website should do more than replace an outdated one-page site. It should create a coherent local brand and work as an actual ordering product.

The intended customer experience is:

1. Discover the brand and El Salvador origin story.
2. Browse drinks, food, and retail coffee bags.
3. Customize eligible items.
4. Place a pickup order.
5. Pay at pickup initially, with real online payments added after the merchant provider is confirmed.
6. Track the order from the same device.
7. Optionally sign in, order faster, and earn loyalty points.

The intended staff experience is:

1. Receive incoming website orders through the existing Quantic POS/KDS setup.
2. Route drink items to the front coffee station and food items to the kitchen station.
3. Move orders through New, Preparing, Ready, and Complete in Quantic.
4. Mark items available or sold out.
5. Use the website admin area for content, forms, and history. Treat its live-order board only as a future/fallback/testing tool rather than the launch-day KDS.

## Brand and design direction

The site uses a warm editorial coffee aesthetic with modern ordering interactions.

### Core palette

- Deep espresso brown for headers and dark sections
- Cream and warm paper backgrounds
- Golden caramel accent
- Teal action color
- Burnt orange for origin storytelling

The exact CSS variables are defined at the top of `app/globals.css`.

### Typography

- Georgia is used for large editorial headings.
- Geist is used for interface text and body copy.
- The mix should feel premium, warm, and easy to scan.

### Brand rules

- Use the shark fin alone as the favicon.
- The favicon must be the exact original file from the existing website: `https://www.deafsharkcoffee.com/images/ds_logo2.png`.
- The local exact copy is `public/favicon.png`.
- Do not regenerate, square-pad, reinterpret, or replace that favicon.
- Use the full Deaf Shark coffee wordmark on cups where appropriate, without the circular brown badge background.
- The dog character can appear selectively as a recognizable brand element.
- Do not overuse the dog or make the site feel childish.
- Avoid slogans such as “Fuel your day the Deaf Shark way.”
- Avoid em dashes in customer-facing copy.
- Navigation labels are “Home,” “Menu,” “Our Story,” and “Visit Us.”
- Clickable text links use a left-to-right underline hover animation.
- Pill buttons keep their existing lift or color hover behavior.

### Layout principles

- Mobile-first and app-like.
- Touch targets should work comfortably on tablets and phones.
- Major desktop hero and feature compositions should fit within the viewport beneath the header.
- The ordering experience should feel integrated into the website, not like a disconnected third-party widget.
- Smooth scrolling should feel polished on desktop but never interfere with touch or operational screens.

## Current routes

### `/`

Home page and integrated storefront.

Current sections:

- Sticky brand header with navigation, search, profile, optional order status, and cart or pickup action
- Full-screen hero with rotating featured product display
- Main pickup ordering section with categories and configurator
- Ocean Blend retail bag feature using real product media
- El Salvador origin section
- Visit section
- Footer

### `/menu`

Dedicated ordering page.

Features:

- Full category navigation
- Compact orderable product rows
- Large product display
- Product configurator
- Cart drawer
- Checkout
- Order confirmation
- Query-string deep links such as `/menu?item=ocean-blend-bag`

### `/about`

Visible navigation label: “Our Story.”

The route name remains `/about` so existing links are not broken.

Features:

- Brand origin hero
- El Salvador nursery photography
- Real roasting video
- Farm, roast, and local-business story cards
- Origin facts

### `/contact`

Visible navigation label: “Visit Us.”

The route name remains `/contact` so existing links are not broken.

Features:

- Address and directions
- Phone action
- Pickup order action
- Pickup-only explanation

### `/dashboard`

Touch-oriented staff order dashboard.

Features:

- New, Preparing, and Ready columns
- Automatic polling every 2.2 seconds
- Order status progression
- Order cancellation while New
- Order items, options, payment method, total, pickup estimate, customer, date, and time
- Menu availability controls
- Current customer wait-time control
- Pause online orders button
- Mobile status tabs

Important: dashboard access is not currently protected. This must be fixed before production.

## Header, search, profile, and order status

Shared customer chrome is in `app/site-chrome.tsx`.

### Search

- Search opens from the magnifying glass in the header.
- It searches local `menuProducts` by name, description, and category.
- Results link to `/menu?item=PRODUCT_ID`.
- The matching configurator opens automatically on the menu page.

### Customer account

- The profile button opens a full-height drawer from the right.
- The page behind it is dimmed and blurred.
- The drawer closes with the close button or by selecting the backdrop.
- On mobile, the drawer fills the entire screen.
- Authentication uses the Sites or ChatGPT authenticated-user headers, not custom passwords.
- Sign-in and sign-out paths are defined in `app/chatgpt-auth.ts`.

### Loyalty

- A `customer_profiles` record is created for authenticated users.
- Signed-in orders award at least one point.
- Current rule: `floor(total dollars)`, with a minimum of one point.
- The UI describes earning one point per dollar.
- The progress bar currently treats 100 points as the next $5 reward threshold.
- Reward redemption is not implemented.
- Loyalty rules need business approval before production.

### Customer order status

- There is intentionally no “My Orders” navigation page.
- When a device places an order, the order number and phone are stored locally.
- An “Order Status” control appears near the cart only for a device with an order reference.
- The status opens in a header popover.
- The customer sees New, Preparing, Ready, Complete, or Cancelled state based on the stored order.
- The current lookup API requires both order number and matching phone number.

## Ordering workflow

The main implementation is in `app/storefront.tsx`.

### Customer flow

1. Select a product.
2. Configure available options.
3. Add it to the cart.
4. Open the cart drawer.
5. Continue to checkout.
6. Enter name and phone.
7. Select pay at pickup or card demo.
8. Submit the order.
9. Receive an order number and 15-minute estimate.
10. View order status from the header.

### Product configuration

Coffee supports:

- Hot or iced
- Whole, oat, or almond milk
- Extra espresso shot
- Quantity
- Special instructions

Some sandwiches support Regular or Large sizing.

The Ocean Blend bag is currently a simple whole-bean retail item without grind selection. A production version should probably add Whole Bean, Drip, Espresso, French Press, and similar grind options if the shop supports them.

### Payment status

- “Pay at pickup” is the real first-release direction.
- “Card payment demo” is UI only.
- No card number is collected.
- No payment processor is integrated.
- Do not describe card checkout as production-ready.
- A real provider should be selected after confirming the merchant’s current POS and payment system.

### Tax

- The demo calculates 6.625% tax.
- Confirm taxable categories and final tax handling before launch.

## Current menu data

Menu data is centralized in `app/menu-data.ts`.

Categories:

- Coffee
- Non-Coffee
- Breakfast
- Sandwiches
- Bites
- Cold Drinks
- Coffee Beans

Current demo items include:

- Ocean Blend bag
- Latte
- Cortado
- Cappuccino
- Americano
- Espresso
- Regular Coffee
- Chicha
- Full photographed breakfast menu, including bread choices and priced add-ons
- The Shark Cubano
- Chicken Sandwich
- Emilia
- Turkey Pesto
- Chicken Pesto
- La Toscana
- Cachapa
- Four Tequeños
- Cachitos
- French Fries
- Mozzarella sticks
- Chicken wings with fries
- Refrigerator water, soda, juice, tea, coconut water, sports drinks, and energy drinks

All menu names, descriptions, prices, modifiers, and availability defaults remain provisional until confirmed by the business.

Known provisional product details:

- Ocean Blend is displayed as a 12 oz medium roast whole-bean bag from El Salvador.
- Ocean Blend is currently priced at $19.00 from the in-store notes.
- Refrigerator availability and exact flavors should remain staff-controlled because stock changes frequently.

The photographed menu is now the primary source for displayed products and prices; remaining ambiguous items still require owner confirmation.

## Dashboard behavior and limitations

Dashboard UI is in `app/dashboard/dashboard.tsx`.

### Working behavior

- Orders poll automatically.
- Staff can move an order from New to Preparing, Ready, and Complete.
- Staff can cancel a New order.
- Cards display order date and local time in a format such as `Aug 17, 2026 · 9:53 PM`.
- Menu availability updates persist in D1 and appear on the customer menu within a few seconds.
- Customer wait time and the online-order pause switch persist in D1.
- Pausing online ordering disables checkout and is also enforced by the order API.
- Orders show whether pickup is ASAP or scheduled.

### Important current limitations

- Dashboard sales summary currently totals all loaded non-cancelled orders, even though the label may imply a daily total.
- Completed and cancelled orders disappear from the three active columns, but there is no order history interface.
- Dashboard API routes have no staff authorization.
- Scheduling uses configurable default hours and validation, but the business must confirm its operating hours and cutoff policy.
- Scheduled pickup is disabled for pay-at-pickup orders to reduce no-shows. The current card option remains a demo until Stripe is connected.

Recommended next dashboard work:

1. Protect dashboard routes and mutation APIs with a staff role.
2. Add separate coffee and kitchen station views.
3. Add order history, date filters, daily totals, and search.
4. Add sound or visual alerts for newly received orders.
5. Confirm and expose editable scheduling hours and cutoff rules.
6. Consider platform source badges for DoorDash and future integrations.

## Data and API architecture

### Stack

- React 19
- Vinext and Vite
- TypeScript
- Cloudflare Workers-compatible output
- Cloudflare D1
- Drizzle ORM
- Sites hosting
- Lenis smooth scrolling

Node requirement: 22.13.0 or newer.

### Database binding

`.openai/hosting.json` declares:

- D1 binding: `DB`
- R2: not used

### Tables

#### `orders`

Stores:

- order number
- customer name
- phone
- serialized items
- subtotal, tax, and total in cents
- status
- source
- payment method
- pickup estimate
- fulfillment type (`asap` or `scheduled`)
- optional scheduled pickup timestamp
- optional authenticated customer user ID
- creation timestamp

#### `menu_availability`

Stores a product ID, available boolean, and update timestamp.

#### `customer_profiles`

Stores authenticated user ID, email, display name, loyalty points, and timestamps.

#### `store_settings`

Stores the active preparation estimate, online-order pause state, business hours, cutoff minutes, and scheduled-pickup slot and horizon settings.

### APIs

#### `GET /api/orders`

- Returns up to 80 orders sorted newest first.
- Used by the dashboard.
- Currently unauthenticated.

#### `POST /api/orders`

- Creates a pickup order.
- Requires name, phone, and at least one item.
- Rebuilds and validates every item selection against the server-owned menu catalog.
- Calculates authoritative subtotal, tax, and total instead of trusting browser prices.
- Rejects sold-out products and all orders while online ordering is paused.
- Validates ASAP business-hour cutoffs and scheduled pickup slots.
- Associates the order with the authenticated user when available.
- Awards loyalty points for authenticated users.

#### `PATCH /api/orders/:id`

- Updates order status.
- Valid statuses: new, preparing, ready, complete, cancelled.
- Currently unauthenticated.

#### `GET /api/menu-state`

- Returns persisted availability by product ID plus wait time, pause state, hours, and scheduling settings.

#### `PATCH /api/menu-state`

- Updates availability, wait time, and pause state.
- Currently unauthenticated.

#### `POST /api/customer-orders`

- Looks up one order by order number and matching phone number.

#### `GET /api/profile`

- Returns authentication state, profile, loyalty points, and sign-in or sign-out path.

### Schema initialization

- `db/index.ts` uses `ensureSchema()` to create required tables and indexes if they do not already exist.
- Drizzle migrations also exist under `drizzle/`.
- Keep migrations packaged with deployment archives.

## Media assets

Primary public assets:

- `public/favicon.png`: exact original fin favicon
- `public/deafshark-logo.png`: circular premium logo
- `public/deafshark-dog-art.png`: dog character artwork
- `public/finca-label.png`: origin label reference
- `public/ocean-blend-bags.jpg`: real Ocean Blend bag photography
- `public/ocean-blend-bags.mp4`: short retail bag video
- `public/el-salvador-nursery.jpg`: real El Salvador nursery image
- `public/deaf-shark-roasting.mp4`: actual roasting footage
- `public/roasting-poster.jpg`: poster frame for roasting video
- `public/og.png`: social preview image

Media usage principles:

- Use real supplied business media before generating generic coffee imagery.
- Keep autoplay video muted, looping, and `playsInline`.
- Use poster frames and compressed media for mobile performance.
- Do not dump every available clip onto the site. Each asset should support a specific product or origin story.

Potential cleanup:

- `public/file.svg`, `public/globe.svg`, and `public/window.svg` appear to be unused starter assets.
- Verify usage before deleting them.

## Smooth scrolling

Implementation: `app/smooth-scroll-provider.tsx`.

Behavior:

- Lenis duration: 1.2 seconds
- Exponential easing
- Smooth wheel enabled
- Wheel multiplier: 1
- Disabled when `prefers-reduced-motion: reduce` is active
- Disabled on touch devices and screens 768 px wide or narrower
- Disabled on `/dashboard`
- Cart, checkout, configurator, and account drawer use `data-lenis-prevent` for independent scrolling

Do not enable inertial scrolling on the staff dashboard. Operational controls should remain immediate.

## Responsive behavior

- Desktop header is sticky.
- Mobile navigation appears as a bottom app-style bar.
- Cart becomes a persistent mobile action when it contains items.
- The account drawer becomes full-screen on mobile.
- Product configurator and checkout become full-screen on mobile.
- Menu categories scroll horizontally on small screens.
- Dashboard columns switch to mobile status tabs.
- The Our Story nursery and roasting composition fits within one desktop viewport below the header.
- On mobile, story media returns to a natural stacked layout.

## Development commands

From the project root:

```bash
npm install
npm run dev
```

Local URL is normally:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Generate a Drizzle migration after schema edits:

```bash
npm run db:generate
```

## Hosting and deployment

The site is hosted with Sites and must continue using the existing project in `.openai/hosting.json`.

Deployment requirements:

- Build with `npm run build`.
- Push the exact committed source before saving a version.
- Package `dist/`, `.openai/hosting.json`, and `drizzle/` migrations.
- Deploy privately unless the owner explicitly approves broader access.
- Never create a second Sites project for this codebase.
- Never store a short-lived repository token in Git config, a remote URL, or documentation.

## User preferences that should remain in force

- Do not use em dashes in customer-facing site copy.
- Keep the exact original fin favicon.
- Use “Our Story,” not “About,” in visible navigation.
- Use “Visit Us,” not “Contact,” in visible navigation.
- Keep a Home link in navigation.
- Use left-to-right animated underlines on clickable text links.
- Keep ordering prominent on the home page.
- Keep the site mobile-first and app-like.
- Keep the dashboard touch-friendly.
- Keep the account experience as a right-side sliding drawer.
- Keep order status contextual near the cart instead of adding a permanent My Orders navigation page.
- Keep delivery out of the initial customer flow.
- Continue presenting El Salvador as a central brand story, but verify detailed farm claims before production.
- Use the dog selectively.

## Production blockers

The current implementation is a functional demo, not a production commerce system.

Do not launch as a real public ordering system until these are addressed:

1. Confirm the complete menu, prices, modifiers, sizes, allergens, and availability.
2. Confirm business hours and holiday-hour behavior.
3. Confirm the merchant’s POS and payment provider.
4. Integrate a real payment processor only after merchant approval.
5. Protect the dashboard and staff mutation APIs.
6. Add staff accounts or roles.
7. Confirm tax handling.
8. Add order throttling, rate limiting, and abuse protection.
9. Add privacy policy, terms, refund and cancellation policies, and accessibility review.
10. Confirm SMS, email, or push notification requirements.
11. Verify all origin, veteran-owned, product, and sourcing claims with the business.
12. Test on the exact store hardware and network.
13. Define backup procedures for internet or dashboard outages.

## Recommended next implementation sequence

### Phase 1: make the demo operationally accurate

1. Obtain and enter the final menu.
2. Add dashboard authentication and staff authorization.
3. Add separate coffee and kitchen station views.
4. Add order history and daily filtering.
5. Add new-order alerts.
6. Confirm business hours and make scheduling settings editable.

### Phase 2: payments and customer communication

1. Confirm POS and payment provider.
2. Implement real online card payments.
3. Add receipts.
4. Add ready-for-pickup notifications.
5. Define cancellation and refund behavior.

### Phase 3: accounts and loyalty

1. Confirm loyalty earn and redemption rules.
2. Implement reward redemption.
3. Add signed-in order history.
4. Add saved customer details and favorites if approved.

### Phase 4: delivery platform aggregation

1. Confirm which platforms the shop adopts.
2. Investigate official APIs and aggregator support.
3. Normalize external orders into the dashboard.
4. Show clear source badges and platform-specific actions.
5. Avoid promising this until platform permissions and commercial terms are known.

## Guidance for the next developer or AI

- Preserve the existing project structure and working build.
- Read `app/storefront.tsx`, `app/site-chrome.tsx`, `app/dashboard/dashboard.tsx`, `app/menu-data.ts`, `db/schema.ts`, and `app/globals.css` before making broad changes.
- Keep changes scoped and validate with `npm run build`.
- Preserve existing user changes and assets.
- Treat every current price and detailed menu description as demo data unless verified.
- Do not claim that card payment, dashboard security, or delivery integration is complete.
- Prefer real Deaf Shark media and facts over generic additions.
- Maintain consistent responsive behavior and accessible keyboard interaction.
