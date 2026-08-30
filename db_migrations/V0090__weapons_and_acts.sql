CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.weapons (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    kind        VARCHAR(24)  NOT NULL DEFAULT 'rifled',
    caliber     VARCHAR(80)  NOT NULL DEFAULT '',
    serial_no   VARCHAR(120) NOT NULL DEFAULT '',
    roh_number  VARCHAR(120) NOT NULL DEFAULT '',
    roh_date    DATE,
    owner_name  VARCHAR(200) NOT NULL DEFAULT 'Усков Александр Николаевич',
    sort_order  INTEGER NOT NULL DEFAULT 100,
    note        TEXT,
    archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  INTEGER,
    created_by_name VARCHAR(160),
    updated_by  INTEGER
);

CREATE TABLE IF NOT EXISTS t_p51170708_tablet_app_creation.weapon_acts (
    id           SERIAL PRIMARY KEY,
    weapon_id    INTEGER NOT NULL,
    guest_id     INTEGER NOT NULL,
    act_date     DATE NOT NULL,
    hunt_from    DATE NOT NULL,
    hunt_to      DATE NOT NULL,
    receiver_name    VARCHAR(200) NOT NULL DEFAULT '',
    receiver_roh     VARCHAR(120) NOT NULL DEFAULT '',
    receiver_roh_date DATE,
    receiver_weapon  TEXT,
    file_url     TEXT,
    archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP,
    created_by   INTEGER,
    created_by_name VARCHAR(160),
    updated_by   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_weapon_acts_weapon
    ON t_p51170708_tablet_app_creation.weapon_acts (weapon_id);
CREATE INDEX IF NOT EXISTS idx_weapon_acts_guest
    ON t_p51170708_tablet_app_creation.weapon_acts (guest_id);

INSERT INTO t_p51170708_tablet_app_creation.weapons
    (name, kind, caliber, serial_no, roh_number, roh_date, sort_order)
VALUES
    ('Blaser R93', 'rifled', '.30-06 Spr', '9/212150', '0029697499', '2023-12-28', 10),
    ('MANNLICHER AUG', 'rifled', '.223 Rem', 'серия SAZ № 0686', '0026638440', '2023-07-27', 20),
    ('STM-308', 'rifled', '.308 Win', '308APK 190', '0029698925', '2024-02-16', 30),
    ('КО ВСС', 'smooth', '7,62х39', '2101079', '0026638443', '2023-07-27', 40);
