<?php
// Endpoint to verify Sutradhar login credentials or secret invite token
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_REQUEST;

$token = trim($data['auth'] ?? $data['token'] ?? '');
$phone = trim($data['user'] ?? $data['phone'] ?? '');
$pass = trim($data['pass'] ?? $data['password'] ?? '');

$cleanPhone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}

// Master Admin Bypass or Testing
if ($pass === 'SRA#2026' || $pass === 'SRA_MASTER_7775') {
    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => "वरिष्ठ सूत्रधार (Master)",
        "phone" => $cleanPhone ?: "9517117775",
        "sutradhar_id" => "SUTRA-MASTER-01",
        "role" => "सूत्रधार लेवल 2"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$jsonFile = __DIR__ . '/career_applications.json';
$candidates = [];
if (file_exists($jsonFile)) {
    $candidates = json_decode(file_get_contents($jsonFile), true) ?: [];
}

$matched = null;

foreach ($candidates as $c) {
    // Check 1: Direct secret token matching with phone
    if (!empty($token) && !empty($c['secret_token']) && hash_equals($c['secret_token'], $token)) {
        if (empty($cleanPhone) || $c['phone'] === $cleanPhone) {
            $matched = $c;
            break;
        }
    }
    // Check 2: Phone + Password login
    if (!empty($cleanPhone) && !empty($pass) && $c['phone'] === $cleanPhone) {
        if (!empty($c['secret_pass']) && $c['secret_pass'] === $pass) {
            $matched = $c;
            break;
        }
    }
}

if ($matched) {
    if ($matched['status'] !== 'approved') {
        echo json_encode([
            "status" => "error",
            "authenticated" => false,
            "message" => "आपका आवेदन वर्तमान में 'अंडर प्रोसेस' है। आचार्य समिति द्वारा अनुमोदन के पश्चात ही पोर्टल खुलेगा।"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => $matched['name'],
        "phone" => $matched['phone'],
        "sutradhar_id" => $matched['sutradhar_id'],
        "role" => "सूत्रधार लेवल 1"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// If no match found
http_response_code(401);
echo json_encode([
    "status" => "error",
    "authenticated" => false,
    "message" => "अमान्य क्रेडेंशियल्स अथवा अनधिकृत लिंक। कृपया सही यूजर आईडी व गुप्त पासकोड दर्ज करें।"
], JSON_UNESCAPED_UNICODE);
?>