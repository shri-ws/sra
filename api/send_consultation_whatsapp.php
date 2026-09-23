<?php
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

if (!$data || empty($data['full_name']) || empty($data['phone'])) {
    echo json_encode(["status" => "error", "message" => "Full Name and Phone are required"]);
    exit();
}

$name     = htmlspecialchars($data['full_name']);
$phone    = htmlspecialchars($data['phone']);
$email    = htmlspecialchars($data['email'] ?? 'Not provided');
$dob      = htmlspecialchars($data['dob'] ?? 'Not provided');
$tob      = htmlspecialchars($data['tob'] ?? 'Not provided');
$place    = htmlspecialchars($data['place_of_birth'] ?? 'Not provided');
$question = htmlspecialchars($data['question'] ?? 'No specific question');

$adminPhone = "919517117775";
$adminEmail = "eshriee@gmail.com";

// Format WhatsApp Message Body
$waMessage = "🚩 *NEW PERSONAL CONSULTATION REQUEST* 🚩\n" .
             "*Shri Ramji Astro (shriramjiastro.in)*\n\n" .
             "👤 *Client Name:* {$name}\n" .
             "📱 *Client Phone:* {$phone}\n" .
             "📧 *Client Email:* {$email}\n" .
             "📅 *Date of Birth:* {$dob}\n" .
             "⏰ *Time of Birth:* {$tob}\n" .
             "📍 *Place of Birth:* {$place}\n\n" .
             "💬 *Query:* \n\"{$question}\"\n\n" .
             "⏰ Submitted At: " . date("d-M-Y H:i:s T");

// 1. Send Webhook Notification to Make.com
$makeWebhookUrl = "https://hook.us2.make.com/ptf1fbzxqq0kmegfwiptjjp1xjuuaoup";
$makePayload = json_encode([
    "type" => "consultation_request",
    "title" => "New Consultation Request from {$name}",
    "content" => $waMessage,
    "full_name" => $name,
    "phone" => $phone,
    "email" => $email,
    "dob" => $dob,
    "tob" => $tob,
    "place_of_birth" => $place,
    "question" => $question,
    "submitted_at" => date("c")
]);

$ch = curl_init($makeWebhookUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $makePayload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_exec($ch);
curl_close($ch);

// 2. Direct Email Alert to Astro Raamji (eshriee@gmail.com)
$to = $adminEmail;
$subject = "🚩 New Consultation Request: {$name} ({$phone})";
$headers = "From: no-reply@shriramjiastro.in\r\n" .
           "Reply-To: {$email}\r\n" .
           "X-Mailer: PHP/" . phpversion() . "\r\n" .
           "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($to, $subject, $waMessage, $headers);

// 3. Return response with direct WhatsApp link
$waDeepLink = "https://api.whatsapp.com/send?phone=" . $adminPhone . "&text=" . urlencode($waMessage);

echo json_encode([
    "status" => "success",
    "message" => "Consultation alert dispatched to admin (+91 95171 17775)",
    "whatsapp_link" => $waDeepLink
]);
?>
