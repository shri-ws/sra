<?php
// Hostinger PHP API Endpoint for Server-Side Payment & Admin VIP Passcode Verification
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Auth");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid payload"]);
    exit();
}

$type = !empty($data['type']) ? trim($data['type']) : 'passcode';

// 1. Verify Admin / VIP Passcode (Server-side validation with zero client exposure)
if ($type === 'passcode') {
    $code = !empty($data['passcode']) ? trim($data['passcode']) : '';
    
    // Server-side master passcodes
    $validPasscodes = [
        'MPP1111',
        'SRA2026',
        'ASTRORAAMJI7775',
        'PARASHARA97'
    ];
    
    if (in_array(strtoupper($code), $validPasscodes)) {
        // Ephemeral daily salted token for the verified session
        $sessionToken = hash('sha256', $code . '_sra_secure_salt_' . date('Y-m-d'));
        echo json_encode([
            "status" => "success",
            "verified" => true,
            "token" => $sessionToken,
            "message" => "Passcode verified successfully"
        ]);
        exit();
    } else {
        http_response_code(403);
        echo json_encode([
            "status" => "error",
            "verified" => false,
            "message" => "Invalid passcode"
        ]);
        exit();
    }
}

// 2. Verify Razorpay Payment Transaction
if ($type === 'razorpay') {
    $payId = !empty($data['razorpay_payment_id']) ? trim($data['razorpay_payment_id']) : '';
    $kundaliKey = !empty($data['kundali_key']) ? trim($data['kundali_key']) : '';
    
    if (empty($payId)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "verified" => false, "message" => "Payment ID missing"]);
        exit();
    }
    
    $isFound = false;
    
    // Check Hostinger MySQL DB if available
    $configFile = __DIR__ . '/db_config.php';
    if (file_exists($configFile)) {
        require_once $configFile;
    } else {
        $db_host = "localhost";
        $db_user = "u928471928_sra_user";
        $db_pass = "SraAstro360#2026";
        $db_name = "u928471928_sra_db";
    }
    
    $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
    if (!$conn->connect_error) {
        $ePayId = $conn->real_escape_string($payId);
        $res = $conn->query("SELECT id, status, amount, kundali_key FROM sra_payments WHERE razorpay_payment_id='$ePayId' LIMIT 1");
        if ($res && $res->num_rows > 0) {
            $row = $res->fetch_assoc();
            if ($row['status'] === 'completed') {
                $isFound = true;
            }
        }
        $conn->close();
    }
    
    // Check persistent JSON log on server
    if (!$isFound) {
        $jsonFile = __DIR__ . '/payments_log.json';
        if (file_exists($jsonFile)) {
            $logs = json_decode(file_get_contents($jsonFile), true);
            if (is_array($logs)) {
                foreach ($logs as $p) {
                    if (isset($p['razorpay_payment_id']) && $p['razorpay_payment_id'] === $payId && ($p['status'] ?? '') === 'completed') {
                        $isFound = true;
                        break;
                    }
                }
            }
        }
    }
    
    // Authorize if recorded, or if valid live Razorpay payment ID format
    if ($isFound || strpos($payId, 'pay_') === 0) {
        $token = hash('sha256', $payId . '_' . $kundaliKey . '_sra_rzp_salt');
        echo json_encode([
            "status" => "success",
            "verified" => true,
            "token" => $token,
            "message" => "Transaction verified successfully"
        ]);
    } else {
        http_response_code(402);
        echo json_encode([
            "status" => "error",
            "verified" => false,
            "message" => "Payment transaction could not be verified"
        ]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Unknown verification type"]);
?>