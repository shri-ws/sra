<?php
// Hostinger MySQL Database Configuration & User Query Logger
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Hostinger DB Credentials (Update with your Hostinger DB details if needed)
$db_host = "localhost";
$db_user = "u928471928_sra_user";     // Hostinger MySQL Username
$db_pass = "SraAstro360#2026";        // Hostinger MySQL Password
$db_name = "u928471928_sra_db";       // Hostinger MySQL Database Name

// Attempt DB Connection
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

// Fallback to SQLite or JSON File if MySQL Credentials are default / unconfigured
if ($conn->connect_error) {
    // Store in local JSON log file on server
    $jsonFile = __DIR__ . '/user_queries_log.json';
    $existing = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
    if (!is_array($existing)) $existing = [];

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if ($data) {
        $data['logged_at'] = date('Y-m-d H:i:s');
        $existing[] = $data;
        file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "success", "mode" => "file", "message" => "Query logged successfully"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid JSON payload"]);
    }
    exit();
}

// Auto-create MySQL table if not exists
$createTableSql = "CREATE TABLE IF NOT EXISTS sra_user_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    candidate_name VARCHAR(100),
    dob VARCHAR(20),
    tob VARCHAR(20),
    location VARCHAR(150),
    latitude VARCHAR(20),
    longitude VARCHAR(20),
    timezone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

$conn->query($createTableSql);

// Read JSON Input
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if ($data && !empty($data['phone'])) {
    $phone = $conn->real_escape_string($data['phone']);
    $name = isset($data['name']) ? $conn->real_escape_string($data['name']) : '';
    $dob = isset($data['dob']) ? $conn->real_escape_string($data['dob']) : '';
    $tob = isset($data['tob']) ? $conn->real_escape_string($data['tob']) : '';
    $location = isset($data['location']) ? $conn->real_escape_string($data['location']) : '';
    $lat = isset($data['lat']) ? $conn->real_escape_string($data['lat']) : '';
    $lon = isset($data['lon']) ? $conn->real_escape_string($data['lon']) : '';
    $tz = isset($data['tz']) ? $conn->real_escape_string($data['tz']) : '';

    $insertSql = "INSERT INTO sra_user_queries (phone, candidate_name, dob, tob, location, latitude, longitude, timezone) 
                  VALUES ('$phone', '$name', '$dob', '$tob', '$location', '$lat', '$lon', '$tz')";

    if ($conn->query($insertSql)) {
        echo json_encode(["status" => "success", "mode" => "mysql", "message" => "Record inserted into Hostinger MySQL DB"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Insert failed: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Phone number is required"]);
}

$conn->close();
?>
