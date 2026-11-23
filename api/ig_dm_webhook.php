<?php
/**
 * Shri Ramji Astro (SRA) - Instagram Messaging Webhook
 * Handles real-time incoming Instagram DMs and auto-replies via Graph API.
 */

header('Content-Type: application/json; charset=utf-8');

// Configuration
$config_path = dirname(__DIR__) . '/social_agent/social_config.json';
$ig_config = [];
if (file_exists($config_path)) {
    $full_cfg = json_decode(file_get_contents($config_path), true);
    $ig_config = $full_cfg['platforms']['instagram'] ?? [];
}

$access_token = $ig_config['access_token'] ?? getenv('IG_ACCESS_TOKEN') ?? '';
$verify_token = $ig_config['webhook_verify_token'] ?? getenv('IG_WEBHOOK_VERIFY_TOKEN') ?? 'sra_ig_verify_secret_2026';

// 1. Meta Webhook Verification (GET request)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode = $_GET['hub_mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? '';

    if ($mode === 'subscribe' && $token === $verify_token) {
        http_response_code(200);
        echo $challenge;
        exit;
    } else {
        http_response_code(403);
        echo json_encode(["status" => "forbidden", "message" => "Verify token mismatch"]);
        exit;
    }
}

// 2. Incoming Event Processing (POST request)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);

    if (!$payload || !isset($payload['entry'])) {
        http_response_code(400);
        echo json_encode(["status" => "bad_request"]);
        exit;
    }

    // Always acknowledge 200 immediately to Meta
    http_response_code(200);
    echo json_encode(["status" => "received"]);

    // Process incoming message
    foreach ($payload['entry'] as $entry) {
        $messaging = $entry['messaging'] ?? [];
        foreach ($messaging as $event) {
            $sender_id = $event['sender']['id'] ?? null;
            $message_text = trim($event['message']['text'] ?? '');
            $is_echo = $event['message']['is_echo'] ?? false;

            // Ignore echoes or empty text
            if (!$sender_id || empty($message_text) || $is_echo) {
                continue;
            }

            // Generate smart reply based on text
            $reply_text = generateReply($message_text);

            // Log event
            logDmEvent($sender_id, $message_text, $reply_text);

            // Send reply if access token is available
            if (!empty($access_token)) {
                sendInstagramMessage($sender_id, $reply_text, $access_token);
            }
        }
    }
    exit;
}

/**
 * Generate contextual auto-reply based on user text keywords
 */
function generateReply($text) {
    $lower = mb_strtolower($text, 'UTF-8');

    if (preg_match('/(sutradhar|earning|income|wfh|job|work from home|career)/iu', $lower)) {
        return "प्रणाम! श्री रामजी एस्ट्रो 'सूत्रधार' कार्यक्रम के तहत आप घर बैठे प्रामाणिक ज्योतिष परामर्श जोड़कर सम्मानजनक आय प्राप्त कर सकते हैं।\n\nआवेदन व पूरी जानकारी: https://shriramjiastro.in/careers.html";
    }

    if (preg_match('/(kundali|kundli|horoscope|birth chart|bhavishya|future)/iu', $lower)) {
        return "प्रणाम! सटीक पाराशर एवं NASA JPL गणना पर आधारित अपनी संपूर्ण कुंडली और दशा विश्लेषण के लिए आप हमारी वेबसाइट विजिट कर सकते हैं:\nhttps://shriramjiastro.in";
    }

    if (preg_match('/(panchang|tithi|muhurta|shubh)/iu', $lower)) {
        return "प्रणाम! आज का दैनिक शुद्ध पंचांग एवं शुभ मुहूर्त देखने के लिए यहाँ क्लिक करें:\nhttps://shriramjiastro.in/panchang";
    }

    // Default engaging snippet
    return "नमस्ते! श्री रामजी एस्ट्रो में संपर्क करने के लिए धन्यवाद।\n\nहमसे जुड़ने के लिए कृपया अपनी जन्मतिथि, समय और स्थान साझा करें, या अधिक जानकारी के लिए हमारी वेबसाइट shriramjiastro.in पर पधारें।";
}

/**
 * Send DM via Meta Graph API
 */
function sendInstagramMessage($recipient_id, $text, $token) {
    $url = "https://graph.facebook.com/v19.0/me/messages";
    $payload = [
        "recipient" => ["id" => $recipient_id],
        "message" => ["text" => $text]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Bearer " . $token
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res;
}

/**
 * Log DM event to JSON file
 */
function logDmEvent($sender_id, $incoming, $outgoing) {
    $log_file = dirname(__DIR__) . '/data/sutradhar_store/ig_dm_logs.json';
    $logs = [];
    if (file_exists($log_file)) {
        $logs = json_decode(file_get_contents($log_file), true) ?: [];
    }
    $logs[] = [
        "timestamp" => date('c'),
        "sender_id" => $sender_id,
        "incoming" => $incoming,
        "outgoing" => $outgoing
    ];
    if (count($logs) > 500) {
        $logs = array_slice($logs, -500);
    }
    @file_put_contents($log_file, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
