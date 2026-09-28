<?php

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';

$currentAdmin = requireAdmin($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $statement = $pdo->query(
        'SELECT ID, FirstName, LastName, Username, Role, IsActive, CreatedAt
         FROM Users
         ORDER BY LastName, FirstName, Username'
    );

    $users = array_map(static function (array $user): array {
        return [
            'id' => (int) $user['ID'],
            'firstName' => $user['FirstName'],
            'lastName' => $user['LastName'],
            'username' => $user['Username'],
            'role' => $user['Role'],
            'isActive' => (bool) $user['IsActive'],
            'createdAt' => $user['CreatedAt'],
        ];
    }, $statement->fetchAll());

    echo json_encode(['users' => $users]);
    exit;
}

if (!in_array($method, ['POST', 'PATCH'], true)) {
    header('Allow: GET, POST, PATCH');
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    jsonResponse(400, ['error' => 'Request body must be valid JSON']);
}

if ($method === 'POST') {
    $required = ['firstName', 'lastName', 'username', 'password'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
            jsonResponse(400, ['error' => "Missing required field: {$field}"]);
        }
    }

    $firstName = trim((string) $input['firstName']);
    $lastName = trim((string) $input['lastName']);
    $username = trim((string) $input['username']);
    $password = (string) $input['password'];

    if (strlen($firstName) > 50 || strlen($lastName) > 50 || strlen($username) > 50) {
        jsonResponse(400, ['error' => 'Name and username fields must be 50 characters or fewer']);
    }

    if (strlen($password) < 8) {
        jsonResponse(400, ['error' => 'Password must be at least 8 characters']);
    }

    try {
        $statement = $pdo->prepare(
            "INSERT INTO Users (FirstName, LastName, Username, Password, Role, IsActive)
             VALUES (:first_name, :last_name, :username, :password, 'admin', 1)"
        );
        $statement->execute([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            jsonResponse(409, ['error' => 'Username already taken']);
        }

        jsonResponse(500, ['error' => 'Unable to create administrator']);
    }

    http_response_code(201);
    echo json_encode([
        'message' => 'Administrator created',
        'userId' => (int) $pdo->lastInsertId(),
    ]);
    exit;
}

if ($method === 'PATCH') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
        jsonResponse(400, ['error' => 'A valid user id is required']);
    }

    $hasPassword = array_key_exists('password', $input);
    $hasActiveStatus = array_key_exists('isActive', $input);
    if (!$hasPassword && !$hasActiveStatus) {
        jsonResponse(400, ['error' => 'Provide a password or active status to update']);
    }

    if ($hasPassword && (!is_string($input['password']) || strlen($input['password']) < 8)) {
        jsonResponse(400, ['error' => 'Password must be at least 8 characters']);
    }

    if ($hasActiveStatus && !is_bool($input['isActive'])) {
        jsonResponse(400, ['error' => 'isActive must be true or false']);
    }

    $target = $pdo->prepare('SELECT ID FROM Users WHERE ID = :id');
    $target->execute(['id' => $id]);
    if (!$target->fetch()) {
        jsonResponse(404, ['error' => 'User not found']);
    }

    $updates = [];
    $parameters = ['id' => $id];

    if ($hasPassword) {
        $updates[] = 'Password = :password';
        $parameters['password'] = password_hash($input['password'], PASSWORD_DEFAULT);
    }

    if ($hasActiveStatus) {
        $updates[] = 'IsActive = :is_active';
        $parameters['is_active'] = $input['isActive'] ? 1 : 0;
    }

    try {
        $pdo->beginTransaction();

        $update = $pdo->prepare('UPDATE Users SET ' . implode(', ', $updates) . ' WHERE ID = :id');
        $update->execute($parameters);

        // Password changes and disabling an account invalidate its current logins.
        if ($hasPassword || ($hasActiveStatus && !$input['isActive'])) {
            $sessions = $pdo->prepare('DELETE FROM Sessions WHERE UserID = :id');
            $sessions->execute(['id' => $id]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        jsonResponse(500, ['error' => 'Unable to update user']);
    }

    echo json_encode([
        'message' => 'User updated',
        'userId' => $id,
        'currentAdminId' => (int) $currentAdmin['ID'],
    ]);
    exit;
}
