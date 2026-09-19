<?php
// Hostinger PHP Endpoint - Real WhatsApp OTP Dispatcher
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

// Generate secure random 4-digit OTP
$otp = (string)rand(1000, 9999);
$expiry = time() + 300; // 5 Minutes TTL

// Save OTP on server
$otpFile = __DIR__ . '/active_otps.json';
$otps = file_exists($otpFile) ? json_decode(file_get_contents($otpFile), true) : [];
if (!is_array($otps)) $otps = [];
$otps[$phone] = ['otp' => $otp, 'expiry' => $expiry];
file_put_contents($otpFile, json_encode($otps, JSON_PRETTY_PRINT));

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP API INTEGRATION (UltraMsg / Gateway API)
   If you have an UltraMsg or WhatsApp Gateway API Key, set it below.
   ══════════════════════════════════════════════════════════════════ */
$ULTRAMSG_INSTANCE = "YOUR_INSTANCE_ID"; // Paste UltraMsg Instance ID here
$ULTRAMSG_TOKEN    = "YOUR_ULTRAMSG_TOKEN"; // Paste UltraMsg Token here

$waSent = false;
$msgText = "🪐 *Shri Ramji Astro (Astro 360)*\n\nआपका कुण्डली सत्यापन ओटीपी (OTP) कोड है: *{$otp}*\nयह कोड अगले 5 मिनट के लिए वैध है।";

if ($ULTRAMSG_INSTANCE !== "YOUR_INSTANCE_ID" && $ULTRAMSG_TOKEN !== "YOUR_ULTRAMSG_TOKEN") {
    $params = array(
        'token' => $ULTRAMSG_TOKEN,
        'to' => '+91' . $phone,
        'body' => $msgText
    );
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => "https://api.ultramsg.com/" . $ULTRAMSG_INSTANCE . "/messages/chat",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_HTTPHEADER => array("content-type: application/x-www-form-urlencoded"),
    ));
    $response = curl_exec($curl);
    curl_close($curl);
    $waSent = true;
}

// Generate direct WhatsApp deep link so user can receive/send on WhatsApp
$waDeepLink = "https://api.whatsapp.com/send?phone=91" . $phone . "&text=" . urlencode("Shri Ramji Astro Verification OTP Code for +91" . $phone . " is: " . $otp);

echo json_encode([
    "status" => "success",
    "message" => "WhatsApp OTP generated for +91 " . $phone,
    "whatsapp_link" => $waDeepLink,
    "phone" => $phone
]);
?>
