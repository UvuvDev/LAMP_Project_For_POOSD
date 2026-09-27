<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit;
}
 
$input = json_decode(file_get_contents("php://input"), true);
 
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Request body must be valid JSON"]);
    exit;
}
 
$required = ['first_name', 'last_name', 'username', 'password'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required field: $field"]);
        exit;
    }
}
 
$firstName = trim($input['first_name']);
$lastName  = trim($input['last_name']);
$username  = trim($input['username']);
$password  = $input['password'];
 
$check = $pdo->prepare("SELECT ID FROM Users WHERE Username = :username");
$check->execute(['username' => $username]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(["error" => "Username already taken"]);
    exit;
}

$stmt = $pdo->prepare(
    "INSERT INTO Users (FirstName, LastName, Username, Password)
     VALUES (:first_name, :last_name, :username, :password)"
);
$stmt->execute([
    'first_name' => $firstName,
    'last_name'  => $lastName,
    'username'   => $username,
    'password'   => $password,
]);
 
http_response_code(201);
echo json_encode([
    "message" => "User registered successfully",
    "user_id" => $pdo->lastInsertId()
]);