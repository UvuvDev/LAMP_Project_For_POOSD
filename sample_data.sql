-- -------------------------------------------------------------------
-- SQL Seed Script: sample_data.sql
-- Project: COP4331 LAMP Stack Project (Contacts Manager)
-- Description: Populates ContactsAppDB with initial Users & Contacts.
-- -------------------------------------------------------------------

USE `ContactsAppDB`;

-- 1. Seed Sample Users
-- (Plaintext passwords for demo only)

INSERT INTO `Users` (`FirstName`, `LastName`, `Username`, `Password`, `Role`, `IsActive`, `CreatedAt`, `UpdatedAt`)
VALUES ('Aniya', 'Ross', 'ARoss', 'DemoPass', 'user', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO `Users` (`FirstName`, `LastName`, `Username`, `Password`, `Role`, `IsActive`, `CreatedAt`, `UpdatedAt`)
VALUES ('Finn', 'the Human', 'RealHero', 'Radical!1', 'user', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Seed Initial Contacts for User ID 1 (ARoss)

INSERT INTO `Contacts` (`UserID`, `FirstName`, `LastName`, `Email`, `Phone`, `Birthday`) VALUES
(1, 'Natalie', 'Nunn', 'nataliesemail@gmail.com', '(001)754-8392', '1998-12-20'),
(1, 'Seer', 'Sought', 'iseeyou@gmail.com', '(100)100-1100', NULL),
(1, 'Junior', 'Little', 'littleguy@yahoo.com', '(407)586-7439', '2002-04-26'),
(1, 'Alvin', 'Seville', 'littlechipmunk@gmail.com', '(748)264-1028', '2001-03-17'),
(1, 'Scooby', 'Doo', 'snacklover@gmail.com', '(832)758-1937', '1996-08-04');

-- 3. Seed Initial Contacts for User ID 2 (RealHero)

INSERT INTO `Contacts` (`UserID`, `FirstName`, `LastName`, `Email`, `Phone`, `Birthday`) VALUES
(2, 'Jake', 'the Dog', 'jakethedog@gmail.com', '(011)984-8392', '1998-12-28'),
(2, 'Princess', 'Bubblegum', 'candyprincess@gmail.com', '(100)198-1003', NULL),
(2, 'Tree', 'Trunks', 'applewrangler@gmail.com', '(567)217-4783', '1654-06-18'),
(2, 'Marceline', 'Vamp', 'vampirequeen@yahoo.com', '(983)234-1021', '1764-03-17'),
(2, 'Ice', 'King', 'penguindad@yahoo.com', '(983)234-1021', NULL), -- Test contact for no birthday entry
(2, 'Cinnamon', 'Bun', 'hotbuns@gmail.com', '(101)932-1293', '1997-06-24');