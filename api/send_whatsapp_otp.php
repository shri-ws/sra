<?php
// Hostinger PHP Endpoint - WhatsApp Gateway OTP Sender
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || empty($data['phone']) || empty($data['otp'])) {
    echo json_encode(["status" => "error", "message" => "Phone number and OTP code are required"]);
    exit();
}

$phone = preg_replace('/[^0-9]/', '', $data['phone']);
if (strlen($phone) > 10) {
    $phone = substr($phone, -10);
}
$otp = trim($data['otp']);

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP API CONFIGURATION (UltraMsg / Wati / Interakt / Twilio)
   ══════════════════════════════════════════════════════════════════ */
$WA_INSTANCE_ID = "instance_id_here"; 
$WA_TOKEN       = "token_here";

// Active OTP session storage
$otpFile = __DIR__ . '/active_otps.json';
$otps = file_exists($otpFile) ? json_decode(file_get_contents($otpFile), true) : [];
if (!is_array($otps)) $otps = [];
$otps[$phone] = ['otp' => $otp, 'expiry' => time() + 300];
file_put_contents($otpFile, json_encode($otps, JSON_PRETTY_PRINT));

echo json_encode([
    "status" => "success",
    "message" => "WhatsApp OTP registered for +91 " . $phone,
    "otp" => $otp
]);
?>
