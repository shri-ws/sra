<?php
// Endpoint to verify Sutradhar login credentials or secret invite token & auto-capture onboarding applications
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
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$wa = trim($data['whatsapp'] ?? $phone);

$cleanPhone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}

// Check sutradhar_store/sutradhars.json first
$sutraFile = dirname(__DIR__) . '/data/sutradhar_store/sutradhars.json';
if (file_exists($sutraFile)) {
    $sutras = json_decode(file_get_contents($sutraFile), true) ?: [];
    foreach ($sutras as $sKey => $sVal) {
        $p = $sVal['phone'] ?? '';
        $cleanP = preg_replace('/[^0-9]/', '', $p);
        if (strlen($cleanP) > 10) $cleanP = substr($cleanP, -10);

        if (!empty($cleanPhone) && $cleanP === $cleanPhone) {
            echo json_encode([
                "status" => "success",
                "authenticated" => true,
                "name" => !empty($name) ? $name : ($sVal['name'] ?? "अधिकृत सूत्रधार"),
                "phone" => $cleanPhone,
                "sutradhar_id" => $sVal['sutradhar_id'] ?? $sVal['id'] ?? $sKey,
                "code" => $sVal['code'] ?? $sKey,
                "upi_id" => $sVal['upi_id'] ?? '',
                "role" => "अधिकृत सूत्रधार",
                "onboarding_completed" => true,
                "training_completed" => true
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
}

// Master Admin Bypass or Testing (T1 Test)
if ($cleanPhone === '9517117775' || $cleanPhone === '9415000000' || $pass === 'SRA#2026' || $pass === 'SRA_MASTER_7775' || strtoupper($pass) === 'JAIHANUMAN') {
    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => !empty($name) ? $name : "एस्ट्रो रामजी सूत्रधार",
        "phone" => $cleanPhone ?: "9517117775",
        "sutradhar_id" => "SRA-4B9F91",
        "code" => "SRA-4B9F91",
        "upi_id" => "astroraamji@ptaxis",
        "role" => "अधिकृत सूत्रधार",
        "onboarding_completed" => true,
        "training_completed" => true
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$jsonFile = __DIR__ . '/career_applications.json';
$candidates = [];
if (file_exists($jsonFile)) {
    $candidates = json_decode(file_get_contents($jsonFile), true) ?: [];
}

$matched = null;
$matchedIndex = -1;

foreach ($candidates as $idx => $c) {
    // Check 1: Direct secret token matching with phone
    if (!empty($token) && !empty($c['secret_token']) && hash_equals($c['secret_token'], $token)) {
        if (empty($cleanPhone) || $c['phone'] === $cleanPhone) {
            $matched = $c;
            $matchedIndex = $idx;
            break;
        }
    }
    // Check 2: Phone number verified login
    if (!empty($cleanPhone) && ($c['phone'] ?? '') === $cleanPhone) {
        $matched = $c;
        $matchedIndex = $idx;
        break;
    }
}

if ($matched) {
    // If name or email were passed and were empty, update them
    if (!empty($name) && empty($matched['name'])) {
        $candidates[$matchedIndex]['name'] = $name;
        file_put_contents($jsonFile, json_encode($candidates, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    if ($matched['status'] !== 'approved') {
        echo json_encode([
            "status" => "pending",
            "authenticated" => false,
            "application_id" => $matched['id'] ?? '',
            "message" => "आपका सूत्रधार आवेदन प्राप्त हो चुका है और 'अंडर प्रोसेस' है। व्यवस्थापक (Admin) द्वारा पोर्टल पर अनुमोदन (Approval) होते ही आपका डैशबोर्ड तत्काल सक्रिय हो जाएगा।"
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    echo json_encode([
        "status" => "success",
        "authenticated" => true,
        "name" => $matched['name'],
        "phone" => $matched['phone'],
        "sutradhar_id" => $matched['sutradhar_id'] ?: ('SUTRA-' . substr($matched['phone'], -4) . '-01'),
        "code" => $matched['code'] ?? ('SRA-' . substr($matched['phone'], -4) . '-01'),
        "upi_id" => $matched['upi_id'] ?? '',
        "role" => "सूत्रधार लेवल 1",
        "onboarding_completed" => true,
        "training_completed" => true
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// If no record exists for this phone yet:
// AUTO-CAPTURE NEW APPLICATION IMMEDIATELY SO IT APPEARS ON ADMIN PANEL!
if (!empty($cleanPhone) && strlen($cleanPhone) >= 10) {
    $appId = 'SRA-APP-' . date('ymd') . '-' . substr($cleanPhone, -4) . '-' . mt_rand(10, 99);
    $sutraId = 'SUTRA-' . substr($cleanPhone, -4) . '-01';
    $secretToken = bin2hex(random_bytes(16));
    $secretPass = substr($cleanPhone, -6);
    $now = date('Y-m-d H:i:s');
    $candName = !empty($name) ? $name : 'नया सूत्रधार प्रत्याशी';

    $newRecord = [
        'id' => $appId,
        'name' => $candName,
        'phone' => $cleanPhone,
        'email' => $email,
        'whatsapp' => $wa ?: $cleanPhone,
        'city' => 'ऑनलाइन प्रत्याशी',
        'experience' => 'सूत्रधार पोर्टल प्रवेश फॉर्म',
        'bio' => 'सूत्रधार पोर्टल डायरेक्ट लॉगिन/पंजीकरण',
        'resume_name' => '',
        'sutradhar_id' => $sutraId,
        'secret_token' => $secretToken,
        'secret_pass' => $secretPass,
        'status' => 'pending',
        'approved_at' => null,
        'created_at' => $now
    ];

    $candidates[] = $newRecord;
    file_put_contents($jsonFile, json_encode($candidates, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Also persist to MySQL if configured
    $configFile = __DIR__ . '/db_config.php';
    if (file_exists($configFile)) {
        require_once $configFile;
        $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
        if (!$conn->connect_error) {
            $conn->query("CREATE TABLE IF NOT EXISTS sra_career_applications (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(128) NOT NULL,
                phone VARCHAR(32) NOT NULL,
                email VARCHAR(128),
                city VARCHAR(128),
                experience TEXT,
                bio TEXT,
                resume_name VARCHAR(255),
                sutradhar_id VARCHAR(64),
                secret_token VARCHAR(64),
                secret_pass VARCHAR(32),
                status VARCHAR(32) DEFAULT 'pending',
                approved_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $stmt = $conn->prepare("INSERT INTO sra_career_applications 
                (id, name, phone, email, city, experience, bio, sutradhar_id, secret_token, secret_pass, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email)");
            if ($stmt) {
                $emptyBio = 'सूत्रधार पोर्टल डायरेक्ट पंजीकरण';
                $stmt->bind_param("sssssssssss", 
                    $appId, $candName, $cleanPhone, $email, $newRecord['city'], $newRecord['experience'], $emptyBio, $sutraId, $secretToken, $secretPass, $now
                );
                $stmt->execute();
            }
            $conn->close();
        }
    }

    echo json_encode([
        "status" => "pending",
        "authenticated" => false,
        "application_id" => $appId,
        "message" => "आपका सूत्रधार आवेदन सफलतापूर्वक प्राप्त हो गया है और 'अंडर प्रोसेस' है। व्यवस्थापक (Admin) द्वारा पोर्टल पर अनुमोदन (Approval) होते ही आपका डैशबोर्ड तत्काल सक्रिय हो जाएगा।"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

http_response_code(400);
echo json_encode([
    "status" => "error",
    "authenticated" => false,
    "message" => "कृपया १० अंकों का वैध मोबाइल नंबर दर्ज करें।"
], JSON_UNESCAPED_UNICODE);
?>
