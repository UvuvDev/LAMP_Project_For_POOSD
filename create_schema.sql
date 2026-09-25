-- -------------------------------------------------------------------
-- SQL Schema Script: create_schema.sql
-- Project: COP 4331 LAMP Stack (Contacts Manager)
-- Description: Create the ContactsAppDB database, Users table,
--              Contacts table (stores each user's contacts), Sessions
--              table, and grant the application user permissions.
-- -------------------------------------------------------------------

-- 1. Create the database.
CREATE DATABASE IF NOT EXISTS `ContactsAppDB`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ContactsAppDB`;

-- 2. Create Users table.
CREATE TABLE IF NOT EXISTS `Users` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `FirstName` VARCHAR(50) NOT NULL DEFAULT '',
  `LastName` VARCHAR(50) NOT NULL DEFAULT '',
  `Username` VARCHAR(50) NOT NULL DEFAULT '',
  `Password` VARCHAR(255) NOT NULL DEFAULT '',
  `Role` ENUM('user','admin') NOT NULL DEFAULT 'user',
  `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  UNIQUE INDEX `idx_users_login` (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Contacts table (stores each user's own contacts).
CREATE TABLE IF NOT EXISTS `Contacts` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `UserID` INT NOT NULL,
  `FirstName` VARCHAR(50) NOT NULL DEFAULT '',
  `LastName` VARCHAR(50) NOT NULL DEFAULT '',
  `Email` VARCHAR(100) NOT NULL DEFAULT '',
  `Phone` VARCHAR(20) NOT NULL DEFAULT '',
  `Birthday` DATE NULL DEFAULT NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_contacts_userid` (`UserID`),
  CONSTRAINT `fk_contacts_userid` FOREIGN KEY (`UserID`)
    REFERENCES `Users`(`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Sessions table:
--    Stores a randomly generated token per login, linked to UserID.
--    The frontend attaches this token to every subsequent API call so
--    the backend can identify which user is making the request, without
--    requiring credentials on every call. ExpiresAt lets the backend
--    reject stale tokens.
CREATE TABLE IF NOT EXISTS `Sessions` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `UserID` INT NOT NULL,
  `Token` VARCHAR(255) NOT NULL DEFAULT '',
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ExpiresAt` DATETIME NOT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE INDEX `idx_sessions_token` (`Token`),
  INDEX `idx_sessions_userid` (`UserID`),
  CONSTRAINT `fk_sessions_userid` FOREIGN KEY (`UserID`)
    REFERENCES `Users`(`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create application database user & grant permissions.
-- Note: replace the password below for real/production deployments.
CREATE USER IF NOT EXISTS 'ContactsAppUser'@'localhost' IDENTIFIED BY 'WeLoveCOP4331!';
GRANT ALL PRIVILEGES ON `ContactsAppDB`.* TO 'ContactsAppUser'@'localhost';

FLUSH PRIVILEGES;
