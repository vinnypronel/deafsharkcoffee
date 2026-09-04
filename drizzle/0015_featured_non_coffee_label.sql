-- The matcha slide still carried the retired "Non-Coffee" label, which the
-- storefront fell back to the raw menu category for ("Matcha"). 0014 only
-- matched rows already reading "Matcha", so it never touched this one.
UPDATE `featured_content`
SET `category_label` = 'Beverages', `updated_at` = unixepoch()
WHERE `product_id` = 'strawberry-matcha' AND `category_label` IN ('Non-Coffee', 'Matcha');
