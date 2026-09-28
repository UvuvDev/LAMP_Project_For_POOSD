<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body must be valid JSON']);
    exit;
}

$required = ['first_name', 'last_name', 'username', 'password'];
foreach ($required as $field) {
    if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: {$field}"]);
        exit;
    }
}

$firstName = trim((string) $input['first_name']);
$lastName = trim((string) $input['last_name']);
$username = trim((string) $input['username']);
$password = (string) $input['password'];

if (strlen($firstName) > 50 || strlen($lastName) > 50 || strlen($username) > 50) {
    http_response_code(400);
    echo json_encode(['error' => 'Name and username fields must be 50 characters or fewer']);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters']);
    exit;
}

try {
    $statement = $pdo->prepare(
        'INSERT INTO Users (FirstName, LastName, Username, Password)
         VALUES (:first_name, :last_name, :username, :password)'
    );
    $statement->execute([
        'first_name' => $firstName,
        'last_name' => $lastName,
        'username' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
    ]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Username already taken']);
        exit;
    }

    http_response_code(500);
    echo json_encode(['error' => 'Unable to register user']);
    exit;
}

http_response_code(201);
echo json_encode([
    'message' => 'User registered successfully',
    'user_id' => (int) $pdo->lastInsertId(),
]);
