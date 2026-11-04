<?php
// Hostinger PHP API Endpoint to Save Career Applications (Sutradhar Onboarding)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
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
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

$name = trim($data['name'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$city = trim($data['city'] ?? '');
$experience = trim($data['experience'] ?? '');
$bio = trim($data['bio'] ?? '');
$resume_name = trim($data['resume_name'] ?? '');
$resume_data = trim($data['resume_data'] ?? ''); // Base64 or text

if (empty($name) || empty($phone)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "नाम एवं मोबाइल नंबर अनिवार्य हैं।"]);
    exit();
}

// Normalize phone
$cleanPhone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}

// Generate application ID and secure tokens
$appId = 'SRA-APP-' . date('ymd') . '-' . mt_rand(100, 999);
$sutradharId = 'SUTRA-' . substr($cleanPhone, -4) . '-' . mt_rand(10, 99);
$secretToken = bin2hex(random_bytes(16));
$secretPass = strval(mt_rand(100000, 999999));
$createdAt = date('Y-m-d H:i:s');

$record = [
    'id' => $appId,
    'name' => $name,
    'phone' => $cleanPhone,
    'email' => $email,
    'city' => $city,
    'experience' => $experience,
    'bio' => $bio,
    'resume_name' => $resume_name,
    'resume_data' => $resume_data,
    'sutradhar_id' => $sutradharId,
    'secret_token' => $secretToken,
    'secret_pass' => $secretPass,
    'status' => 'pending', // pending, approved, rejected
    'approved_at' => null,
    'created_at' => $createdAt
];

// 1. Save to Hostinger MySQL DB if available
$dbSaved = false;
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if (!$conn->connect_error) {
    $createSql = "CREATE TABLE IF NOT EXISTS sra_career_applications (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        email VARCHAR(128),
        city VARCHAR(128),
        experience TEXT,
        bio TEXT,
        resume_name VARCHAR(255),
        resume_data LONGTEXT,
        sutradhar_id VARCHAR(64),
        secret_token VARCHAR(64),
        secret_pass VARCHAR(32),
        status VARCHAR(32) DEFAULT 'pending',
        approved_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $conn->query($createSql);

    $stmt = $conn->prepare("INSERT INTO sra_career_applications 
        (id, name, phone, email, city, experience, bio, resume_name, resume_data, sutradhar_id, secret_token, secret_pass, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ON DUPLICATE KEY UPDATE 
        name=VALUES(name), email=VALUES(email), city=VALUES(city), experience=VALUES(experience), bio=VALUES(bio), resume_name=VALUES(resume_name), resume_data=VALUES(resume_data)");
    
    if ($stmt) {
        $stmt->bind_param("sssssssssssss", 
            $appId, $name, $cleanPhone, $email, $city, $experience, $bio, $resume_name, $resume_data, $sutradharId, $secretToken, $secretPass, $createdAt
        );
        $stmt->execute();
        $dbSaved = true;
        $stmt->close();
    }
    $conn->close();
}

// 2. Dual-write to JSON Fallback Log File
$jsonFile = __DIR__ . '/career_applications.json';
$existing = [];
if (file_exists($jsonFile)) {
    $content = file_get_contents($jsonFile);
    $existing = json_decode($content, true) ?: [];
}

// Check if already applied with this phone
$found = false;
foreach ($existing as &$item) {
    if ($item['phone'] === $cleanPhone) {
        $item['name'] = $name;
        $item['email'] = $email;
        $item['city'] = $city;
        $item['experience'] = $experience;
        $item['bio'] = $bio;
        if (!empty($resume_name)) $item['resume_name'] = $resume_name;
        if (!empty($resume_data)) $item['resume_data'] = $resume_data;
        $appId = $item['id'];
        $found = true;
        break;
    }
}
if (!$found) {
    $existing[] = $record;
}

file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    "status" => "success",
    "application_id" => $appId,
    "candidate_name" => $name,
    "phone" => $cleanPhone,
    "message" => "आपका आवेदन सफलतापूर्वक प्राप्त हो गया है। आपका चयन 'अंडर प्रोसेस' है। हमारी आचार्य समिति आपके विवरण का परीक्षण कर २४ से ४८ घंटों के भीतर आपके पंजीकृत व्हाट्सएप / ईमेल पर संपर्क करेगी।"
], JSON_UNESCAPED_UNICODE);
?>