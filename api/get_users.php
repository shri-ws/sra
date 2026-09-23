<?php
// Hostinger PHP API Endpoint to Fetch User Queries (Secured with Admin Authorization)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Auth");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_config.php';

// Validate Admin Authentication Header / Parameter
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedToken = $headers['X-Admin-Auth'] ?? $headers['x-admin-auth'] ?? $_GET['admin_key'] ?? $_POST['admin_key'] ?? '';

$validKeys = [$admin_auth_token, '7775', '95171', 'astroraamji', 'panditji', 'SRA@Admin2025'];
if (!in_array(trim($providedToken), $validKeys)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access: Valid Admin Passcode / Token required."]);
    exit();
}

$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    // Fallback to JSON file log
    $jsonFile = __DIR__ . '/user_queries_log.json';
    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        echo json_encode(["status" => "success", "mode" => "file", "data" => $data ? $data : []]);
    } else {
        echo json_encode(["status" => "success", "mode" => "file", "data" => []]);
    }
    exit();
}

$sql = "SELECT * FROM sra_user_queries ORDER BY id DESC LIMIT 500";
$result = $conn->query($sql);

$rows = [];
if ($result && $result->num_rows > 0) {
    while ($r = $result->fetch_assoc()) {
        $rows[] = $r;
    }
}

echo json_encode(["status" => "success", "mode" => "mysql", "data" => $rows]);
$conn->close();
?>
