UPDATE `featured_content`
SET `category_label` = 'Beverages', `updated_at` = unixepoch()
WHERE `product_id` = 'strawberry-matcha' AND `category_label` = 'Matcha';
