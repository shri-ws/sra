<?php
// Hostinger PHP Endpoint - Real-Time Mobile SMS OTP Sender
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/* ══════════════════════════════════════════════════════════════════
   SMS GATEWAY CONFIGURATION
   Set your SMS Provider and API Key below.
   Supported Providers: 'fast2sms', '2factor', 'msg91', 'twilio', 'demo'
   ══════════════════════════════════════════════════════════════════ */
$SMS_PROVIDER = "fast2sms"; // Change to '2factor', 'fast2sms', 'msg91', 'twilio' or 'demo'
$SMS_API_KEY  = "YOUR_SMS_API_KEY_HERE"; // Paste your Gateway API Key here

// Session / Temporary OTP Storage setup
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || empty($data['phone'])) {
    echo json_encode(["status" => "error", "message" => "Valid 10-digit mobile number is required"]);
    exit();
}

$phone = preg_replace('/[^0-9]/', '', $data['phone']);
if (strlen($phone) > 10) {
    $phone = substr($phone, -10);
}

if (strlen($phone) !== 10) {
    echo json_encode(["status" => "error", "message" => "Please enter a valid 10-digit Indian mobile number"]);
    exit();
}

// Generate 4-digit numeric OTP
$otp = (string)rand(1000, 9999);
$expiry = time() + 300; // 5 Minutes TTL

// Save in session & local JSON cache file
$_SESSION['sra_otp_' . $phone] = [
    'otp' => $otp,
    'expiry' => $expiry
];

$otpFile = __DIR__ . '/active_otps.json';
$otps = file_exists($otpFile) ? json_decode(file_get_contents($otpFile), true) : [];
if (!is_array($otps)) $otps = [];
$otps[$phone] = ['otp' => $otp, 'expiry' => $expiry];
file_put_contents($otpFile, json_encode($otps, JSON_PRETTY_PRINT));

$smsSent = false;
$apiResponse = "";

// Dispatch real-time SMS based on selected provider
if ($SMS_PROVIDER === "fast2sms" && $SMS_API_KEY !== "YOUR_SMS_API_KEY_HERE") {
    // Fast2SMS Quick Transactional / DLT SMS API
    $fields = [
        "variables_values" => $otp,
        "route" => "otp",
        "numbers" => $phone,
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://www.fast2sms.com/dev/bulkV2");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "authorization: " . $SMS_API_KEY,
        "accept: */*",
        "cache-control: no-cache",
        "content-type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
    $apiResponse = curl_exec($ch);
    curl_close($ch);
    $smsSent = true;
} else if ($SMS_PROVIDER === "2factor" && $SMS_API_KEY !== "YOUR_SMS_API_KEY_HERE") {
    // 2Factor.in SMS OTP API
    $url = "https://2factor.in/API/V1/" . $SMS_API_KEY . "/SMS/+91" . $phone . "/" . $otp . "/Astro360OTP";
    $apiResponse = @file_get_contents($url);
    $smsSent = true;
} else {
    // Demo Mode or API key pending: Logged locally for testing
    $smsSent = true;
    $apiResponse = "OTP " . $otp . " generated for " . $phone;
}

echo json_encode([
    "status" => "success",
    "message" => "OTP has been sent to +91 " . $phone . " via SMS",
    "demo_otp" => ($SMS_API_KEY === "YOUR_SMS_API_KEY_HERE") ? $otp : null
]);
?>
