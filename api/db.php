<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = getenv('APP_DB_CONFIG') ?: '/var/www/lamp/config/db.php';

try {
    if (is_readable($configPath)) {
        $config = require $configPath;
        $pdo = new PDO(
            $config['dsn'],
            $config['user'],
            $config['password'],
            $config['options'] ?? []
        );
    } else {
        $host = getenv('DB_HOST') ?: 'localhost';
        $name = getenv('DB_NAME') ?: 'ContactsAppDB';
        $user = getenv('DB_USER');
        $password = getenv('DB_PASSWORD');

        if ($user === false || $password === false) {
            throw new RuntimeException('Database configuration is unavailable');
        }

        $pdo = new PDO(
            "mysql:host={$host};dbname={$name};charset=utf8mb4",
            $user,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
