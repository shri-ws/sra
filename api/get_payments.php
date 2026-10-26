<?php
// Hostinger PHP API Endpoint to Fetch All Payment Transactions (Secured with Admin Authorization)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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
    $db_pass = "SraAstro360#2026";
    $db_name = "u928471928_sra_db";
    $admin_auth_token = "SRA_Admin_Master_Token_7775_95171";
}

// Validate Admin Authentication Header / Parameter (Robust across Apache, Nginx, FastCGI)
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedToken = $_SERVER['HTTP_X_ADMIN_AUTH'] 
    ?? $headers['X-Admin-Auth'] 
    ?? $headers['x-admin-auth'] 
    ?? $_GET['admin_key'] 
    ?? $_POST['admin_key'] 
    ?? '';

$validKeys = [
    $admin_auth_token ?? 'SRA_Admin_Master_Token_7775_95171',
    '7775',
    '95171',
    'astroraamji',
    'panditji',
    'SRA@Admin2025'
];

if (!in_array(trim($providedToken), $validKeys)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access: Valid Admin Passcode / Token required."]);
    exit();
}

$payments = [];

// 1. Fetch from Hostinger MySQL DB if available
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if (!$conn->connect_error) {
    $createSql = "CREATE TABLE IF NOT EXISTS sra_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        razorpay_payment_id VARCHAR(100) NOT NULL,
        student_name VARCHAR(120) DEFAULT '',
        student_phone VARCHAR(50) DEFAULT '',
        student_email VARCHAR(150) DEFAULT '',
        plan_name VARCHAR(150) DEFAULT '',
        report_type VARCHAR(100) DEFAULT '',
        amount INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'completed',
        kundali_key VARCHAR(150) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rzp_id (razorpay_payment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $conn->query($createSql);

    $sql = "SELECT * FROM sra_payments ORDER BY id DESC LIMIT 500";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        while ($r = $result->fetch_assoc()) {
            $r['amount'] = intval($r['amount']);
            $payments[] = $r;
        }
    }
    $conn->close();
}

// 2. Merge with persistent payments_log.json
$jsonFile = __DIR__ . '/payments_log.json';
if (file_exists($jsonFile)) {
    $fileData = json_decode(file_get_contents($jsonFile), true);
    if (is_array($fileData)) {
        $fileData = array_reverse($fileData);
        $seen = [];
        foreach ($payments as $p) {
            if (!empty($p['razorpay_payment_id'])) {
                $seen[$p['razorpay_payment_id']] = true;
            }
        }
        foreach ($fileData as $f) {
            $pid = $f['razorpay_payment_id'] ?? '';
            if ($pid && !isset($seen[$pid])) {
                $f['amount'] = intval($f['amount'] ?? 0);
                $payments[] = $f;
                $seen[$pid] = true;
            }
        }
    }
}

// Sort newest first
usort($payments, function($a, $b) {
    return strtotime($b['created_at'] ?? '1970-01-01') - strtotime($a['created_at'] ?? '1970-01-01');
});

echo json_encode(["status" => "success", "mode" => "hybrid", "data" => $payments]);
?>
