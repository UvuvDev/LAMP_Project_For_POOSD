<?php
$servername = "localhost";
$username = "ContactsAppUser";
$password = "WeLoveCOP4331!";
$dbname = "ContactsAppDB";
try {
        $pdo = new PDO(
        "mysql:host=$servername;dbname=$dbname;charset=utf8mb4",
        $username,
        $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        

} catch (PDOException $e) {
    http_response_code(500);
    echo "Database error: " . $e->getMessage();
    exit;
}

?>