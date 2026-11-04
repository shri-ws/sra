<?php
// Hostinger PHP API Endpoint to Approve / Reject Sutradhar Candidates (Secured with Admin Authorization)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
    $db_pass = getenv('DB_PASS') ?: "";
    $db_name = "u928471928_sra_db";
    $admin_auth_token = getenv('ADMIN_AUTH_TOKEN') ?: "";
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedToken = $_SERVER['HTTP_X_ADMIN_AUTH'] 
    ?? $headers['X-Admin-Auth'] 
    ?? $headers['x-admin-auth'] 
    ?? $_GET['admin_key'] 
    ?? $_POST['admin_key'] 
    ?? '';

$validKeys = array_filter([
    getenv('ADMIN_AUTH_TOKEN') ?: null,
    $admin_auth_token ?? null
]);

require_once __DIR__ . '/master_key.php';
if (!in_array(trim($providedToken), $validKeys) && !sra_is_master_key($providedToken)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access: Valid Admin Passcode / Token required."]);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$appId = trim($data['id'] ?? '');
$newStatus = trim($data['status'] ?? 'approved'); // approved, rejected, pending

if (empty($appId)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Application ID is required."]);
    exit();
}

$approvedAt = ($newStatus === 'approved') ? date('Y-m-d H:i:s') : null;
$updatedRecord = null;

// 1. Update in MySQL
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if (!$conn->connect_error) {
    $stmt = $conn->prepare("UPDATE sra_career_applications SET status=?, approved_at=? WHERE id=?");
    if ($stmt) {
        $stmt->bind_param("sss", $newStatus, $approvedAt, $appId);
        $stmt->execute();
        $stmt->close();
    }
    $conn->close();
}

// 2. Update in JSON file
$jsonFile = __DIR__ . '/career_applications.json';
if (file_exists($jsonFile)) {
    $content = file_get_contents($jsonFile);
    $existing = json_decode($content, true) ?: [];
    foreach ($existing as &$item) {
        if ($item['id'] === $appId) {
            $item['status'] = $newStatus;
            $item['approved_at'] = $approvedAt;
            // Ensure token and pass exist
            if (empty($item['secret_token'])) $item['secret_token'] = bin2hex(random_bytes(16));
            if (empty($item['secret_pass'])) $item['secret_pass'] = strval(mt_rand(100000, 999999));
            $updatedRecord = $item;
            break;
        }
    }
    file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Construct invite link and WhatsApp text
$domain = "https://shriramjiastro.in";
$secretToken = $updatedRecord['secret_token'] ?? '';
$secretPass = $updatedRecord['secret_pass'] ?? '';
$phone = $updatedRecord['phone'] ?? '';
$candidateName = $updatedRecord['name'] ?? 'साधक';

$inviteUrl = $domain . "/sutradhar.html?auth=" . urlencode($secretToken) . "&user=" . urlencode($phone);

$waMessage = "सादर प्रणाम " . $candidateName . " जी!\n\n"
    . "श्री राम जी एस्ट्रो आचार्य परिषद द्वारा आपका सूत्रधार (वैदिक दूत) आवेदन स्वीकृत कर लिया गया है।\n\n"
    . "📌 आपकी सूत्रधार लॉगिन क्रेडेंशियल्स:\n"
    . "• यूजर आईडी: " . $phone . "\n"
    . "• गुप्त पासकोड (Password): " . $secretPass . "\n\n"
    . "🔐 आपकी व्यक्तिगत ऑनबोर्डिंग लिंक:\n" . $inviteUrl . "\n\n"
    . "इस लिंक पर क्लिक करके आप अपना दैनिक टास्क व शास्त्रोक्त प्रशिक्षण तत्काल प्रारंभ कर सकते हैं।\n\n"
    . "शुभम् भवतु!\n— श्री राम जी एस्ट्रो (shriramjiastro.in)";

$waShareUrl = "https://wa.me/91" . $phone . "?text=" . urlencode($waMessage);

echo json_encode([
    "status" => "success",
    "application_id" => $appId,
    "new_status" => $newStatus,
    "secret_pass" => $secretPass,
    "secret_token" => $secretToken,
    "invite_url" => $inviteUrl,
    "whatsapp_share_url" => $waShareUrl,
    "message" => "आवेदक की स्थिति सफलतापूर्वक अपडेट की गई।"
], JSON_UNESCAPED_UNICODE);
?>