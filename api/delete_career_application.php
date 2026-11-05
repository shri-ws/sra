<?php
// Hostinger PHP API Endpoint to Delete Career Applications
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Auth");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/db_config.php';
if (file_exists($configFile)) {
    require_once $configFile;
} else {
    $db_host = "localhost";
    $db_user = "u928471928_sra_user";
    $db_pass = getenv('DB_PASS') ?: "";
    $db_name = "u928471928_sra_db";
    $admin_auth_token = getenv('ADMIN_AUTH_TOKEN') ?: "";
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_REQUEST;

$appId = trim($data['id'] ?? '');
$clearAll = !empty($data['clear_all']) || ($appId === 'ALL_PURGE');

$jsonFile = __DIR__ . '/career_applications.json';
$existing = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($existing)) $existing = [];

if ($clearAll) {
    // Purge all applications
    file_put_contents($jsonFile, json_encode([], JSON_PRETTY_PRINT));
    
    // Purge from MySQL
    $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
    if (!$conn->connect_error) {
        $conn->query("TRUNCATE TABLE sra_career_applications");
        $conn->close();
    }

    echo json_encode(["status" => "success", "message" => "सभी सूत्रधार आवेदन सफलतापूर्वक हटा दिए गए।"]);
    exit();
}

if (empty($appId)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Application ID is required"]);
    exit();
}

// 1. Delete from JSON
$newList = array_values(array_filter($existing, function($item) use ($appId) {
    return ($item['id'] ?? '') !== $appId && ($item['phone'] ?? '') !== $appId;
}));
file_put_contents($jsonFile, json_encode($newList, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// 2. Delete from MySQL
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if (!$conn->connect_error) {
    $eId = $conn->real_escape_string($appId);
    $conn->query("DELETE FROM sra_career_applications WHERE id='$eId' OR phone='$eId'");
    $conn->close();
}

echo json_encode(["status" => "success", "message" => "आवेदन (" . $appId . ") सफलतापूर्वक हटा दिया गया।", "deleted_id" => $appId]);
