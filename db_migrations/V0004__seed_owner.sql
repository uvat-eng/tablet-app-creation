INSERT INTO staff (login, name, password_hash, role)
VALUES ('admin', 'Хозяин базы', '413df02ec0cdc8119657d92de11be1071cbdb78388ecc6c21595f7443f6eeabe', 'owner')
ON CONFLICT (login) DO NOTHING;
