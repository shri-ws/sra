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

$configFile = __DIR__ . '/db_config.php';
if (file_exists($configFile)) {
    require_once $configFile;
} else {
    $db_host = "localhost";
    $db_user = "u928471928_sra_user";
    $db_pass = getenv('DB_PASS') ?: "";
    $db_name = "u928471928_sra_db";
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON payload"]);
    exit();
}

$phone = !empty($data['phone']) ? trim($data['phone']) : '';
$email = !empty($data['email']) ? trim($data['email']) : '';
if (empty($email) && filter_var($phone, FILTER_VALIDATE_EMAIL)) {
    $email = $phone;
}
$name = !empty($data['name']) ? trim($data['name']) : (!empty($data['candidate_name']) ? trim($data['candidate_name']) : 'User');
$dob = !empty($data['dob']) ? trim($data['dob']) : '';
$tob = !empty($data['tob']) ? trim($data['tob']) : '';
$location = !empty($data['location']) ? trim($data['location']) : '';
$lat = !empty($data['lat']) ? trim($data['lat']) : (!empty($data['latitude']) ? trim($data['latitude']) : '');
$lon = !empty($data['lon']) ? trim($data['lon']) : (!empty($data['longitude']) ? trim($data['longitude']) : '');
$tz = !empty($data['tz']) ? trim($data['tz']) : (!empty($data['timezone']) ? trim($data['timezone']) : '');
$method = !empty($data['action']) ? trim($data['action']) : (!empty($data['login_method']) ? trim($data['login_method']) : 'OTP_VERIFIED');

// Format clean phone
$cleanPhone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}
if (empty($cleanPhone)) {
    $cleanPhone = $phone;
}

$record = [
    "phone" => $cleanPhone,
    "email" => $email,
    "candidate_name" => $name,
    "dob" => $dob,
    "tob" => $tob,
    "location" => $location,
    "latitude" => $lat,
    "longitude" => $lon,
    "timezone" => $tz,
    "login_method" => $method,
    "logged_at" => date('Y-m-d H:i:s')
];

// 1. Dual-write to persistent local JSON log file on server
$jsonFile = __DIR__ . '/user_queries_log.json';
$existing = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($existing)) $existing = [];

// Keep last 1000 records
$existing[] = $record;
if (count($existing) > 1000) {
    $existing = array_slice($existing, -1000);
}
@file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// 2. Save into Hostinger MySQL DB if available
$dbSaved = false;
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if (!$conn->connect_error) {
    $createTableSql = "CREATE TABLE IF NOT EXISTS sra_user_queries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(150) DEFAULT '',
        candidate_name VARCHAR(100),
        dob VARCHAR(20),
        tob VARCHAR(20),
        location VARCHAR(150),
        latitude VARCHAR(20),
        longitude VARCHAR(20),
        timezone VARCHAR(20),
        login_method VARCHAR(50) DEFAULT 'OTP_VERIFIED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $conn->query($createTableSql);

    @$conn->query("ALTER TABLE sra_user_queries ADD COLUMN email VARCHAR(150) DEFAULT '' AFTER phone");
    @$conn->query("ALTER TABLE sra_user_queries ADD COLUMN login_method VARCHAR(50) DEFAULT 'OTP_VERIFIED' AFTER timezone");

    $ePhone = $conn->real_escape_string($cleanPhone);
    $eEmail = $conn->real_escape_string($email);
    $eName = $conn->real_escape_string($name);
    $eDob = $conn->real_escape_string($dob);
    $eTob = $conn->real_escape_string($tob);
    $eLoc = $conn->real_escape_string($location);
    $eLat = $conn->real_escape_string($lat);
    $eLon = $conn->real_escape_string($lon);
    $eTz = $conn->real_escape_string($tz);
    $eMethod = $conn->real_escape_string($method);

    $insertSql = "INSERT INTO sra_user_queries (phone, email, candidate_name, dob, tob, location, latitude, longitude, timezone, login_method) 
                  VALUES ('$ePhone', '$eEmail', '$eName', '$eDob', '$eTob', '$eLoc', '$eLat', '$eLon', '$eTz', '$eMethod')";

    if ($conn->query($insertSql)) {
        $dbSaved = true;
    }
    $conn->close();
}

echo json_encode([
    "status" => "success",
    "mode" => $dbSaved ? "mysql_and_file" : "file_only",
    "message" => "Record logged successfully"
]);
?>
