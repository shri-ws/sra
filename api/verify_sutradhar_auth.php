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

// Master Admin Bypass or Testing (T1 Test)
if ($cleanPhone === '9517117775' || $cleanPhone === '9415000000' || $pass === 'SRA#2026' || $pass === 'SRA_MASTER_7775' || strtoupper($pass) === 'JAIHANUMAN') {
    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => "T1 Test",
        "phone" => $cleanPhone ?: "9517117775",
        "sutradhar_id" => "SUTRA-7775-01",
        "role" => "सूत्रधार लेवल 1"
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
    // Check 2: Phone number verified login (No password required)
    if (!empty($cleanPhone) && $c['phone'] === $cleanPhone) {
        $matched = $c;
        break;
    }
}

if ($matched) {
    if ($matched['status'] !== 'approved') {
        echo json_encode([
            "status" => "error",
            "authenticated" => false,
            "message" => "आपका सूत्रधार आवेदन वर्तमान में 'अंडर प्रोसेस' है। 24 से 48 घंटे में आचार्य समिति द्वारा अनुमोदन के उपरांत आपका पोर्टल स्वतः सक्रिय हो जाएगा।"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => $matched['name'],
        "phone" => $matched['phone'],
        "sutradhar_id" => $matched['sutradhar_id'] ?: ('SUTRA-' . substr($matched['phone'], -4) . '-01'),
        "role" => "सूत्रधार लेवल 1"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// If no record exists for this phone yet
http_response_code(401);
echo json_encode([
    "status" => "error",
    "authenticated" => false,
    "message" => "यह मोबाइल नंबर अभी सूत्रधार के रूप में पंजीकृत नहीं है। कृपया करियर पेज पर जाकर पहले आवेदन फॉर्म भरें।"
], JSON_UNESCAPED_UNICODE);
?>