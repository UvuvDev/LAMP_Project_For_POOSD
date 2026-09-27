<?php

require 'db.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}
 
$input = json_decode(file_get_contents("php://input"), true);
 
if (!$input || !isset($input['username']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(["error" => "Request must include 'username' and 'password'"]);
    exit;
}
 
$username = trim($input['username']);
$password = $input['password'];
 
$stmt = $pdo->prepare("SELECT * FROM Users WHERE Username = :username");
$stmt->execute(['username' => $username]);
$user = $stmt->fetch();
 
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid username or password"]);
    exit;
}
$passwordMatches = password_verify($password, $user['Password'])
    || $password === $user['Password'];
 
if (!$passwordMatches) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid username or password"]);
    exit;
}
 
unset($user['Password']);
 
http_response_code(200);
echo json_encode([
    "message" => "Login successful",
    "user"    => $user
]);