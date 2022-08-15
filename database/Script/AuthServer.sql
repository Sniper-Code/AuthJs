-- ######################################
-- ##  Database Schema of Auth Server ##
-- ######################################
-- Scripted by : Dibesh Raj Subedi
-- Schema Version: 1.0.0
-- Created At: 06/03/2022
-- Updated At: 06/03/2022
-- ######################################
-- Users Table
-- Creating `users` Table
CREATE TABLE
    IF NOT EXISTS users (
        UserId INTEGER PRIMARY KEY AUTOINCREMENT,
        UserName VARCHAR(16) NOT NULL UNIQUE,
        FullName VARCHAR(200) NOT NULL,
        Email TEXT NOT NULL UNIQUE,
        PASSWORD TEXT NOT NULL,
        IsLoggedIn BOOLEAN NOT NULL DEFAULT 0,
        CreatedAt DATETIME DEFAULT (DATETIME('now', 'localtime')),
        UpdatedAt DATETIME NULL
    );

-- Creating `user_update_at_trigger` Trigger
CREATE TRIGGER
    IF NOT EXISTS users_updated_at_trigger AFTER
UPDATE
    ON users BEGIN
UPDATE users
SET UpdatedAt = (DATETIME('now', 'localtime'))
WHERE UserId = NEW.UserId;

END;