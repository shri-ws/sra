<?php
// Hostinger PHP Endpoint - Real-Time Mobile OTP Verifier
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || empty($data['phone']) || empty($data['otp'])) {
    echo json_encode(["status" => "error", "message" => "Mobile number and OTP are required"]);
    exit();
}

$phone = preg_replace('/[^0-9]/', '', $data['phone']);
if (strlen($phone) > 10) {
    $phone = substr($phone, -10);
}
$submittedOtp = trim($data['otp']);

// 1. Check Session OTP
$sessionKey = 'sra_otp_' . $phone;
$validOtp = null;

if (isset($_SESSION[$sessionKey])) {
    $sessionData = $_SESSION[$sessionKey];
    if (time() <= $sessionData['expiry']) {
        $validOtp = $sessionData['otp'];
    }
}

// 2. Fallback to active_otps.json file check
$otpFile = __DIR__ . '/active_otps.json';
if (!$validOtp && file_exists($otpFile)) {
    $otps = json_decode(file_get_contents($otpFile), true);
    if (is_array($otps) && isset($otps[$phone])) {
        if (time() <= $otps[$phone]['expiry']) {
            $validOtp = $otps[$phone]['otp'];
        }
    }
}

// Strictly verify against active generated OTP
if ($validOtp && $submittedOtp === $validOtp) {
    // Clear used OTP
    unset($_SESSION[$sessionKey]);

    // Save verified mobile number into Hostinger MySQL DB / Local JSON
    $savePayload = [
        "phone" => $phone,
        "name" => isset($data['name']) ? $data['name'] : "Verified User",
        "action" => "OTP_VERIFIED",
        "created_at" => date('Y-m-d H:i:s')
    ];

    // Log to Hostinger DB
    require_once __DIR__ . '/db_config.php';

    $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
    if (!$conn->connect_error) {
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

        $escapedPhone = $conn->real_escape_string($phone);
        $escapedName = $conn->real_escape_string($savePayload['name']);
        $insertSql = "INSERT INTO sra_user_queries (phone, candidate_name) VALUES ('$escapedPhone', '$escapedName')";
        $conn->query($insertSql);
        $conn->close();
    } else {
        $jsonFile = __DIR__ . '/user_queries_log.json';
        $existing = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
        if (!is_array($existing)) $existing = [];
        $existing[] = $savePayload;
        file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        "status" => "success",
        "message" => "Mobile number +91 " . $phone . " verified successfully!",
        "verified_phone" => $phone
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Incorrect or expired OTP code. Please try again."
    ]);
}
?>
