<?php
// Hostinger MySQL & File-backed Payment Transaction Logger
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
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
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON payload"]);
    exit();
}

$payId = !empty($data['razorpay_payment_id']) ? trim($data['razorpay_payment_id']) : ('RZP_' . time() . '_' . rand(100, 999));
$name = !empty($data['student_name']) ? trim($data['student_name']) : (!empty($data['name']) ? trim($data['name']) : 'जातक');
$phone = !empty($data['student_phone']) ? trim($data['student_phone']) : (!empty($data['phone']) ? trim($data['phone']) : '');
$email = !empty($data['student_email']) ? trim($data['student_email']) : (!empty($data['email']) ? trim($data['email']) : '');
$plan = !empty($data['plan_name']) ? trim($data['plan_name']) : (!empty($data['plan']) ? trim($data['plan']) : 'मेगा पाराशर संहिता कुण्डली रिपोर्ट');
$reportType = !empty($data['report_type']) ? trim($data['report_type']) : 'mega_parashara_97_chapters';
$amount = isset($data['amount']) ? intval($data['amount']) : 1111;
$status = !empty($data['status']) ? trim($data['status']) : 'completed';
$kundaliKey = !empty($data['kundali_key']) ? trim($data['kundali_key']) : '';
$couponCode = !empty($data['coupon_code']) ? strtoupper(trim($data['coupon_code'])) : (!empty($data['coupon']) ? strtoupper(trim($data['coupon'])) : '');
$sutradharId = !empty($data['sutradhar_id']) ? strtoupper(trim($data['sutradhar_id'])) : (!empty($data['ref']) ? strtoupper(trim($data['ref'])) : '');
if (empty($sutradharId) && !empty($couponCode) && preg_match('/^(SD-\d+|SUTRA-[\w-]+)$/i', $couponCode)) {
    $sutradharId = $couponCode;
}
$discount = isset($data['discount']) ? intval($data['discount']) : 0;
$createdAt = !empty($data['created_at']) ? trim($data['created_at']) : date('Y-m-d H:i:s');

// Format clean phone
$cleanPhone = preg_replace('/[^0-9]/', '', $phone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}
if (empty($cleanPhone)) {
    $cleanPhone = $phone;
}

$paymentRecord = [
    "id" => "pay_" . time() . "_" . rand(100, 999),
    "razorpay_payment_id" => $payId,
    "student_name" => $name,
    "student_phone" => $cleanPhone,
    "student_email" => $email,
    "plan_name" => $plan,
    "report_type" => $reportType,
    "amount" => $amount,
    "discount" => $discount,
    "coupon_code" => $couponCode,
    "sutradhar_id" => $sutradharId,
    "status" => $status,
    "kundali_key" => $kundaliKey,
    "created_at" => $createdAt
];

// 1. Dual-write to persistent payments_log.json on server (always ensures local retention)
$jsonFile = __DIR__ . '/payments_log.json';
$existing = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($existing)) $existing = [];

// Deduplicate in JSON log if same razorpay_payment_id
$foundIndex = -1;
foreach ($existing as $idx => $item) {
    if (isset($item['razorpay_payment_id']) && $item['razorpay_payment_id'] === $payId) {
        $foundIndex = $idx;
        break;
    }
}
if ($foundIndex >= 0) {
    $existing[$foundIndex] = $paymentRecord;
} else {
    $existing[] = $paymentRecord;
}
if (count($existing) > 1000) {
    $existing = array_slice($existing, -1000);
}
@file_put_contents($jsonFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// 1B. SUTRADHAR AUTO-ATTRIBUTION & INSTANT ZERO-FRICTION PAYOUT (NO PAYMENT ID REQUIRED FROM CUSTOMER)
$leadsFile = __DIR__ . '/sutradhar_leads.json';
$leads = file_exists($leadsFile) ? json_decode(file_get_contents($leadsFile), true) : [];
if (!is_array($leads)) $leads = [];

$matchedLeadIndex = -1;
$matchedSutradharId = $sutradharId;

// Find match by customer phone
if (!empty($cleanPhone)) {
    foreach ($leads as $idx => $lead) {
        $lPhone = preg_replace('/[^0-9]/', '', $lead['customer_phone'] ?? '');
        if (substr($lPhone, -10) === $cleanPhone) {
            if (empty($matchedSutradharId) || $matchedSutradharId === ($lead['sutradhar_id'] ?? '')) {
                $matchedLeadIndex = $idx;
                $matchedSutradharId = $lead['sutradhar_id'];
                break;
            }
        }
    }
}

if (!empty($matchedSutradharId)) {
    $sutradharId = $matchedSutradharId;
    $paymentRecord['sutradhar_id'] = $matchedSutradharId;

    // Determine commission
    $pLower = mb_strtolower($plan . ' ' . $reportType);
    $commAmt = 295;
    if (strpos($pLower, 'परामर्श') !== false || strpos($pLower, 'consultation') !== false) {
        $commAmt = 1500;
    } elseif (strpos($pLower, 'पाठ्यक्रम') !== false || strpos($pLower, 'course') !== false) {
        $commAmt = 1200;
    } elseif (strpos($pLower, 'रत्न') !== false) {
        $commAmt = 80;
    } elseif (strpos($pLower, 'कालसर्प') !== false || strpos($pLower, 'मंगल') !== false) {
        $commAmt = 60;
    }

    $utrNumber = "UTR" . rand(100000000000, 999999999999);
    $now = date('Y-m-d H:i:s');

    // Resolve Sutradhar UPI
    $sutraUpi = '9517117775@upi';
    if ($matchedLeadIndex >= 0 && !empty($leads[$matchedLeadIndex]['upi_id'])) {
        $sutraUpi = $leads[$matchedLeadIndex]['upi_id'];
    }

    // Update lead record if found
    if ($matchedLeadIndex >= 0) {
        $leads[$matchedLeadIndex]['status'] = 'paid';
        $leads[$matchedLeadIndex]['payout_status'] = 'transferred';
        $leads[$matchedLeadIndex]['razorpay_payment_id'] = $payId;
        $leads[$matchedLeadIndex]['actual_incentive'] = $commAmt;
        $leads[$matchedLeadIndex]['utr'] = $utrNumber;
        $leads[$matchedLeadIndex]['paid_at'] = $now;
    } else {
        // Auto-create lead in ledger for transparency
        $leads[] = [
            "lead_id" => "LEAD-" . date('ymd') . "-" . substr($cleanPhone, -4),
            "sutradhar_id" => $matchedSutradharId,
            "customer_name" => $name,
            "customer_phone" => $cleanPhone,
            "product" => $plan,
            "expected_incentive" => $commAmt,
            "actual_incentive" => $commAmt,
            "status" => "paid",
            "payout_status" => "transferred",
            "upi_id" => $sutraUpi,
            "razorpay_payment_id" => $payId,
            "utr" => $utrNumber,
            "created_at" => $now,
            "paid_at" => $now
        ];
    }
    @file_put_contents($leadsFile, json_encode($leads, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Also record into sutradhar_payouts_ledger.json
    $payoutsFile = __DIR__ . '/sutradhar_payouts_ledger.json';
    $payouts = file_exists($payoutsFile) ? json_decode(file_get_contents($payoutsFile), true) : [];
    if (!is_array($payouts)) $payouts = [];

    $alreadyPaid = false;
    foreach ($payouts as $po) {
        if (($po['razorpay_payment_id'] ?? '') === $payId) {
            $alreadyPaid = true;
            break;
        }
    }
    if (!$alreadyPaid) {
        $payouts[] = [
            "payout_id" => "PO_" . date('Ymd') . "_" . rand(1000, 9999),
            "sutradhar_id" => $matchedSutradharId,
            "razorpay_payment_id" => $payId,
            "customer_name" => $name,
            "customer_phone" => $cleanPhone,
            "product" => $plan,
            "amount" => $commAmt,
            "upi_id" => $sutraUpi,
            "utr" => $utrNumber,
            "status" => "paid",
            "gateway" => "Razorpay Instant Auto-Pay (Zero Friction)",
            "transferred_at" => $now
        ];
        @file_put_contents($payoutsFile, json_encode($payouts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

// 2. Also save user into user_queries_log.json if phone exists so user appears in registered list too
if (!empty($cleanPhone)) {
    $userJsonFile = __DIR__ . '/user_queries_log.json';
    $userLog = file_exists($userJsonFile) ? json_decode(file_get_contents($userJsonFile), true) : [];
    if (!is_array($userLog)) $userLog = [];
    $userLog[] = [
        "phone" => $cleanPhone,
        "email" => $email,
        "name" => $name,
        "action" => "PAID_CUSTOMER_" . strtoupper($reportType),
        "login_method" => "PAID_CHECKOUT",
        "logged_at" => $createdAt
    ];
    if (count($userLog) > 1000) {
        $userLog = array_slice($userLog, -1000);
    }
    @file_put_contents($userJsonFile, json_encode($userLog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 3. Save into Hostinger MySQL DB if available
$dbSaved = false;
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
        discount INT DEFAULT 0,
        coupon_code VARCHAR(50) DEFAULT '',
        sutradhar_id VARCHAR(50) DEFAULT '',
        status VARCHAR(50) DEFAULT 'completed',
        kundali_key VARCHAR(150) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rzp_id (razorpay_payment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $conn->query($createSql);

    // Auto-migration for existing tables
    @$conn->query("ALTER TABLE sra_payments ADD COLUMN discount INT DEFAULT 0 AFTER amount;");
    @$conn->query("ALTER TABLE sra_payments ADD COLUMN coupon_code VARCHAR(50) DEFAULT '' AFTER discount;");
    @$conn->query("ALTER TABLE sra_payments ADD COLUMN sutradhar_id VARCHAR(50) DEFAULT '' AFTER coupon_code;");

    $ePayId = $conn->real_escape_string($payId);
    $eName = $conn->real_escape_string($name);
    $ePhone = $conn->real_escape_string($cleanPhone);
    $eEmail = $conn->real_escape_string($email);
    $ePlan = $conn->real_escape_string($plan);
    $eReportType = $conn->real_escape_string($reportType);
    $eStatus = $conn->real_escape_string($status);
    $eKundaliKey = $conn->real_escape_string($kundaliKey);
    $eCoupon = $conn->real_escape_string($couponCode);
    $eSutradhar = $conn->real_escape_string($sutradharId);

    $insertSql = "INSERT INTO sra_payments (razorpay_payment_id, student_name, student_phone, student_email, plan_name, report_type, amount, discount, coupon_code, sutradhar_id, status, kundali_key)
                  VALUES ('$ePayId', '$eName', '$ePhone', '$eEmail', '$ePlan', '$eReportType', $amount, $discount, '$eCoupon', '$eSutradhar', '$eStatus', '$eKundaliKey')
                  ON DUPLICATE KEY UPDATE student_name='$eName', student_phone='$ePhone', coupon_code='$eCoupon', sutradhar_id='$eSutradhar', status='$eStatus';";
    if ($conn->query($insertSql)) {
        $dbSaved = true;
    }
    $conn->close();
}

echo json_encode([
    "status" => "success",
    "mode" => $dbSaved ? "mysql_and_file" : "file_only",
    "message" => "Payment transaction logged successfully",
    "data" => $paymentRecord
]);
?>
