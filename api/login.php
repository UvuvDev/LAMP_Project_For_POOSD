<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input) || !isset($input['username'], $input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => "Request must include 'username' and 'password'"]);
    exit;
}

$username = trim((string) $input['username']);
$password = (string) $input['password'];

$statement = $pdo->prepare(
    'SELECT ID, FirstName, LastName, Username, Password, Role, IsActive
     FROM Users
     WHERE Username = :username
     LIMIT 1'
);
$statement->execute(['username' => $username]);
$user = $statement->fetch();

$storedPassword = $user ? (string) $user['Password'] : '';
$passwordInfo = password_get_info($storedPassword);
$usesPasswordHash = ($passwordInfo['algoName'] ?? 'unknown') !== 'unknown';
$passwordMatches = $user && ($usesPasswordHash
    ? password_verify($password, $storedPassword)
    : hash_equals($storedPassword, $password));

if (!$passwordMatches) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}

if (!(bool) $user['IsActive']) {
    http_response_code(403);
    echo json_encode(['error' => 'Account is disabled']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Upgrade old plaintext demo passwords when the user next logs in.
    if (!$usesPasswordHash) {
        $upgrade = $pdo->prepare('UPDATE Users SET Password = :password WHERE ID = :id');
        $upgrade->execute([
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'id' => $user['ID'],
        ]);
    }

    $pdo->exec('DELETE FROM Sessions WHERE ExpiresAt <= NOW()');

    $token = bin2hex(random_bytes(32));
    $session = $pdo->prepare(
        'INSERT INTO Sessions (UserID, Token, ExpiresAt)
         VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL 20 MINUTE))'
    );
    $session->execute([
        'user_id' => $user['ID'],
        'token' => $token,
    ]);

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['error' => 'Unable to create a login session']);
    exit;
}

http_response_code(200);
echo json_encode([
    'message' => 'Login successful',
    'token' => $token,
    'expires_in' => 1200,
    'user' => [
        'id' => (int) $user['ID'],
        'firstName' => $user['FirstName'],
        'lastName' => $user['LastName'],
        'username' => $user['Username'],
        'role' => $user['Role'],
    ],
]);
