-- Новый пароль Жарскому С.Л. (член клуба, логин zsl)
UPDATE staff
   SET password_hash = '8513cca78e3ac531f7dae3fd94fc5070b6b7a81d15060735461c14e10e4fc8ad',
       password_changed = FALSE,
       password_changed_at = NULL
 WHERE login = 'zsl';
