ALTER TABLE board_columns
    ADD COLUMN completed boolean NOT NULL DEFAULT false;

UPDATE board_columns
SET completed = true
WHERE lower(trim(name)) IN ('done', 'hoàn tất');

