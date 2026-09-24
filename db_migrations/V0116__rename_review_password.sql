UPDATE t_p51170708_tablet_app_creation.staff
SET password_hash = 'a18b38d4a8b815c1f31153220d1664198468207b9b92ccecd30ce46d66816eb7',
    password_changed = false
WHERE lower(login) = 'appreview';