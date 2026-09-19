<?php
// Hostinger PHP API Endpoint to Fetch All User Queries for Admin Panel
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = "localhost";
$db_user = "u928471928_sra_user";
$db_pass = "SraAstro360#2026";
$db_name = "u928471928_sra_db";

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
