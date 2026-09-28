<?php

declare(strict_types=1);

function jsonResponse(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function bearerToken(): string
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($authorization === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', trim($authorization), $matches)) {
        jsonResponse(401, ['error' => 'Authentication required']);
    }

    return trim($matches[1]);
}

function requireUser(PDO $pdo): array
{
    $statement = $pdo->prepare(
        'SELECT u.ID, u.FirstName, u.LastName, u.Username, u.Role, u.IsActive
         FROM Sessions AS s
         INNER JOIN Users AS u ON u.ID = s.UserID
         WHERE s.Token = :token
           AND s.ExpiresAt > NOW()
           AND u.IsActive = 1
         LIMIT 1'
    );
    $statement->execute(['token' => bearerToken()]);
    $user = $statement->fetch();

    if (!$user) {
        jsonResponse(401, ['error' => 'Session is invalid or expired']);
    }

    return $user;
}

function requireAdmin(PDO $pdo): array
{
    $user = requireUser($pdo);

    if ($user['Role'] !== 'admin') {
        jsonResponse(403, ['error' => 'Administrator access required']);
    }

    return $user;
}
