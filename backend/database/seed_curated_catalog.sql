-- ========================================================
-- DZ-SHOP Default Seed Catalog & Admin Account
-- Use this file to populate a fresh MySQL database with
-- the curated Sephora-inspired luxury beauty catalog.
-- ========================================================

USE `elegancia`;

-- Insert default admin (username: admin, default password: admin123456)
INSERT INTO `admins` (`id`, `username`, `password_hash`, `created_at`) 
VALUES (1, 'admin', '$2a$10$GaQmI9tattrf6SQms6Z.luXvNUzX3yw0sc5Oyk3/a.x4DIrozIuuG', NOW())
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- Insert curated luxury beauty catalog
INSERT INTO `products` (`id`, `name`, `description`, `price`, `buying_price`, `category`, `stock`, `image`, `created_at`) VALUES
(1, 'Hydra Glow Hyaluronic Acid Face Serum', 'Intensely hydrating daily serum packed with multi-molecular hyaluronic acid and vitamin B5 for plump, glowing skin.', 4200.00, 3200.00, 'Skincare', 30, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', NOW()),
(2, 'Luxe Rose Eau de Parfum (50ml)', 'Sensual floral fragrance blending Damascena Rose, sparkling Italian bergamot, and warm amber crystals.', 7800.00, 5800.00, 'Fragrance', 18, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80', NOW()),
(3, 'Vitamin C 20% Radiance Glow Cream', 'Brightening antioxidant moisturizer that evens skin tone, fades dark spots, and restores youthful radiance.', 3900.00, 2900.00, 'Skincare', 22, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', NOW()),
(4, 'Pure Argan & Keratin Repair Hair Serum', 'Intense smoothing hair elixir for silky, frizz-free shine and heat protection up to 230°C.', 2900.00, 2100.00, 'Haircare', 35, 'https://images.unsplash.com/photo-1608248597359-0098f98ecbe1?auto=format&fit=crop&w=800&q=80', NOW()),
(5, 'Botanical Body Polish & Shea Scrub', 'Exfoliating crushed sugar and sweet almond body scrub for baby-soft, luminous and refreshed skin.', 2400.00, 1700.00, 'Bath & Body', 28, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', NOW()),
(6, 'Niacinamide 10% + Zinc Pore Minimizing Toner', 'Purifying botanical essence that refines pores, balances excess sebum, and strengthens the skin barrier.', 3200.00, 2400.00, 'Skincare', 40, 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', NOW()),
(7, 'Oud Royal & Amber Crystal Extrait (100ml)', 'Majestic oriental fragrance featuring smoky Cambodian oud, sweet vanilla orchid, and golden amber.', 9500.00, 7200.00, 'Fragrance', 14, 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80', NOW()),
(8, 'Deep Moisture Collagen Restoring Night Mask', 'Overnight leave-on beauty treatment infused with marine collagen and peptides for firmer, deeply nourished skin.', 4600.00, 3500.00, 'Skincare', 25, 'https://images.unsplash.com/photo-1567928815104-b7980ee5032e?auto=format&fit=crop&w=800&q=80', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`), `stock` = VALUES(`stock`);

-- Insert default delivery agency
INSERT INTO `delivery_agencies` (`id`, `name`, `created_at`)
VALUES (1, 'Yalidine Express', NOW()), (2, 'ZR Express', NOW()), (3, 'Maystro Delivery', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
