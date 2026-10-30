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

$configFile = __DIR__ . '/db_config.php';
if (file_exists($configFile)) {
    require_once $configFile;
} else {
    $db_host = "localhost";
    $db_user = "u928471928_sra_user";
    $db_pass = "SraAstro360#2026";
    $db_name = "u928471928_sra_db";
    $admin_auth_token = "SRA_Admin_Master_Token_7775_95171";
}

// Validate Admin Authentication Header / Parameter (Robust across Apache, Nginx, FastCGI)
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedToken = $_SERVER['HTTP_X_ADMIN_AUTH'] 
    ?? $headers['X-Admin-Auth'] 
    ?? $headers['x-admin-auth'] 
    ?? $_GET['admin_key'] 
    ?? $_POST['admin_key'] 
    ?? '';

$validKeys = array_filter([
    getenv('ADMIN_AUTH_TOKEN') ?: null
]);

require_once __DIR__ . '/master_key.php';
if (!in_array(trim($providedToken), $validKeys) && !sra_is_master_key($providedToken)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access: Valid Admin Passcode / Token required."]);
    exit();
}

$rows = [];

// 1. Fetch from Hostinger MySQL DB if available
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

    $sql = "SELECT * FROM sra_user_queries ORDER BY id DESC LIMIT 500";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        while ($r = $result->fetch_assoc()) {
            $rows[] = $r;
        }
    }
    $conn->close();
}

// 2. Merge with persistent local JSON file (ensuring no OTP logins or file entries are missed)
$jsonFile = __DIR__ . '/user_queries_log.json';
if (file_exists($jsonFile)) {
    $fileData = json_decode(file_get_contents($jsonFile), true);
    if (is_array($fileData)) {
        $fileData = array_reverse($fileData);
        $seen = [];
        foreach ($rows as $r) {
            $phoneKey = trim($r['phone'] ?? '');
            $timeKey = substr($r['created_at'] ?? '', 0, 16);
            $seen[$phoneKey . '_' . $timeKey] = true;
        }
        foreach ($fileData as $f) {
            $phoneKey = trim($f['phone'] ?? '');
            $timeKey = substr($f['logged_at'] ?? ($f['created_at'] ?? ''), 0, 16);
            $dedupKey = $phoneKey . '_' . $timeKey;
            if (!isset($seen[$dedupKey])) {
                $rows[] = [
                    'id' => 'file_' . uniqid(),
                    'phone' => $f['phone'] ?? '',
                    'email' => $f['email'] ?? '',
                    'candidate_name' => $f['name'] ?? ($f['candidate_name'] ?? 'User'),
                    'dob' => $f['dob'] ?? '',
                    'tob' => $f['tob'] ?? '',
                    'location' => $f['location'] ?? '',
                    'latitude' => $f['lat'] ?? ($f['latitude'] ?? ''),
                    'longitude' => $f['lon'] ?? ($f['longitude'] ?? ''),
                    'timezone' => $f['tz'] ?? ($f['timezone'] ?? ''),
                    'login_method' => $f['action'] ?? ($f['login_method'] ?? 'OTP_VERIFIED'),
                    'created_at' => $f['logged_at'] ?? ($f['created_at'] ?? date('Y-m-d H:i:s'))
                ];
                $seen[$dedupKey] = true;
            }
        }
    }
}

// Sort newest first
usort($rows, function($a, $b) {
    return strtotime($b['created_at'] ?? '1970-01-01') - strtotime($a['created_at'] ?? '1970-01-01');
});

echo json_encode(["status" => "success", "mode" => "hybrid", "data" => $rows]);
?>
