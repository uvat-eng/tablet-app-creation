-- Сбрасываю отметку после проверки: Тагильцев свой пароль ещё не менял
UPDATE staff SET password_changed = FALSE, password_changed_at = NULL
 WHERE login = 'tgw';
