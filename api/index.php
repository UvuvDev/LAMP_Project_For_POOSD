<?php

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';

$currentUser = requireUser($pdo);
$userId = (int) $currentUser['ID'];
$method = $_SERVER['REQUEST_METHOD'];

function contactPayload(array $input): array
{
    $required = ['firstName', 'lastName', 'email', 'phone'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
            jsonResponse(400, ['error' => "Missing required field: {$field}"]);
        }
    }

    $contact = [
        'firstName' => trim((string) $input['firstName']),
        'lastName' => trim((string) $input['lastName']),
        'email' => trim((string) $input['email']),
        'phone' => trim((string) $input['phone']),
        'birthday' => isset($input['birthday']) ? trim((string) $input['birthday']) : '',
    ];

    if (strlen($contact['firstName']) > 50 || strlen($contact['lastName']) > 50) {
        jsonResponse(400, ['error' => 'Names must be 50 characters or fewer']);
    }

    if (strlen($contact['email']) > 100 || !filter_var($contact['email'], FILTER_VALIDATE_EMAIL)) {
        jsonResponse(400, ['error' => 'Enter a valid email address']);
    }

    if (strlen($contact['phone']) > 20) {
        jsonResponse(400, ['error' => 'Phone number must be 20 characters or fewer']);
    }

    if ($contact['birthday'] !== '') {
        $parts = explode('-', $contact['birthday']);
        $validDate = count($parts) === 3
            && ctype_digit($parts[0])
            && ctype_digit($parts[1])
            && ctype_digit($parts[2])
            && checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0]);

        if (!$validDate) {
            jsonResponse(400, ['error' => 'Birthday must be a valid date']);
        }
    } else {
        $contact['birthday'] = null;
    }

    return $contact;
}

try {
    if ($method === 'GET') {
        $search = trim((string) ($_GET['q'] ?? ''));

        $sql = 'SELECT ID AS id,
                       FirstName AS firstName,
                       LastName AS lastName,
                       Email AS email,
                       Phone AS phone,
                       Birthday AS birthday
                FROM Contacts
                WHERE UserID = :user_id';
        $parameters = ['user_id' => $userId];

        if ($search !== '') {
            $sql .= ' AND (FirstName LIKE :search_first
                           OR LastName LIKE :search_last
                           OR CONCAT(FirstName, \' \', LastName) LIKE :search_name
                           OR Email LIKE :search_email
                           OR Phone LIKE :search_phone
                           OR Birthday LIKE :search_birthday)';
            $searchValue = '%' . $search . '%';
            $parameters += [
                'search_first' => $searchValue,
                'search_last' => $searchValue,
                'search_name' => $searchValue,
                'search_email' => $searchValue,
                'search_phone' => $searchValue,
                'search_birthday' => $searchValue,
            ];
        }

        $sql .= ' ORDER BY LastName, FirstName';
        $statement = $pdo->prepare($sql);
        $statement->execute($parameters);

        $contacts = array_map(static function (array $contact): array {
            $contact['id'] = (int) $contact['id'];
            return $contact;
        }, $statement->fetchAll());

        echo json_encode(['contacts' => $contacts]);
        exit;
    }

    if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
        header('Allow: GET, POST, PUT, DELETE');
        jsonResponse(405, ['error' => 'Method not allowed']);
    }

    if ($method === 'DELETE') {
        $contactId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$contactId || $contactId < 1) {
            jsonResponse(400, ['error' => 'A valid contact id is required']);
        }

        $statement = $pdo->prepare(
            'DELETE FROM Contacts WHERE ID = :id AND UserID = :user_id'
        );
        $statement->execute(['id' => $contactId, 'user_id' => $userId]);

        if ($statement->rowCount() === 0) {
            jsonResponse(404, ['error' => 'Contact not found']);
        }

        echo json_encode(['message' => 'Contact deleted']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        jsonResponse(400, ['error' => 'Request body must be valid JSON']);
    }
    $contact = contactPayload($input);

    if ($method === 'POST') {
        $statement = $pdo->prepare(
            'INSERT INTO Contacts (UserID, FirstName, LastName, Email, Phone, Birthday)
             VALUES (:user_id, :first_name, :last_name, :email, :phone, :birthday)'
        );
        $statement->execute([
            'user_id' => $userId,
            'first_name' => $contact['firstName'],
            'last_name' => $contact['lastName'],
            'email' => $contact['email'],
            'phone' => $contact['phone'],
            'birthday' => $contact['birthday'],
        ]);

        http_response_code(201);
        echo json_encode([
            'message' => 'Contact added',
            'contactId' => (int) $pdo->lastInsertId(),
        ]);
        exit;
    }

    $contactId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$contactId || $contactId < 1) {
        jsonResponse(400, ['error' => 'A valid contact id is required']);
    }

    $ownedContact = $pdo->prepare(
        'SELECT ID FROM Contacts WHERE ID = :id AND UserID = :user_id'
    );
    $ownedContact->execute(['id' => $contactId, 'user_id' => $userId]);
    if (!$ownedContact->fetch()) {
        jsonResponse(404, ['error' => 'Contact not found']);
    }

    $statement = $pdo->prepare(
        'UPDATE Contacts
         SET FirstName = :first_name,
             LastName = :last_name,
             Email = :email,
             Phone = :phone,
             Birthday = :birthday
         WHERE ID = :id AND UserID = :user_id'
    );
    $statement->execute([
        'first_name' => $contact['firstName'],
        'last_name' => $contact['lastName'],
        'email' => $contact['email'],
        'phone' => $contact['phone'],
        'birthday' => $contact['birthday'],
        'id' => $contactId,
        'user_id' => $userId,
    ]);

    echo json_encode(['message' => 'Contact updated']);
} catch (PDOException $error) {
    jsonResponse(500, ['error' => 'Unable to complete contact request']);
}
