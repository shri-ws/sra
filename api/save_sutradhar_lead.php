<?php
// ============================================================================
// श्री राम जी एस्ट्रो (shriramjiastro.in) - आधिकारिक सूत्रधार लीड पंजीकरण API
// SRA SUTRADHAR LEAD REGISTRATION API (ZERO PAYMENT-ID FRICTION)
// ============================================================================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

$sutradharId = !empty($data['sutradhar_id']) ? strtoupper(trim($data['sutradhar_id'])) : '';
$custName = !empty($data['customer_name']) ? trim($data['customer_name']) : 'जातक';
$custPhone = !empty($data['customer_phone']) ? trim($data['customer_phone']) : '';
$product = !empty($data['product']) ? trim($data['product']) : 'मेगा पाराशर संहिता जन्मकुण्डली रिपोर्ट (₹1,111)';
$upiId = !empty($data['upi_id']) ? trim($data['upi_id']) : '';

// Clean phone (10 digits)
$cleanPhone = preg_replace('/[^0-9]/', '', $custPhone);
if (strlen($cleanPhone) > 10) {
    $cleanPhone = substr($cleanPhone, -10);
}

if (empty($sutradharId) || empty($cleanPhone) || strlen($cleanPhone) < 10) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "सूत्रधार आईडी और जातक का 10-अंकों का वैध मोबाइल नंबर अनिवार्य है।"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Calculate expected incentive
function getLeadIncentive($prod) {
    $p = mb_strtolower($prod);
    if (strpos($p, 'मेगा') !== false || strpos($p, 'parashara') !== false || strpos($p, 'kundali') !== false) {
        return ["amount" => 295, "desc" => "मेगा पाराशर संहिता कुण्डली रिपोर्ट"];
    }
    if (strpos($p, 'मुहूर्त') !== false || strpos($p, 'muhurta') !== false) {
        return ["amount" => 295, "desc" => "सम्पूर्ण शास्त्रोक्त मुहूर्त शोधन"];
    }
    if (strpos($p, 'परामर्श') !== false || strpos($p, 'consultation') !== false) {
        return ["amount" => 1500, "desc" => "दैवज्ञ 1-on-1 VIP परामर्श"];
    }
    if (strpos($p, 'पाठ्यक्रम') !== false || strpos($p, 'course') !== false) {
        return ["amount" => 1200, "desc" => "1-वर्षीय वैदिक ज्योतिष गुरुकुल पाठ्यक्रम"];
    }
    if (strpos($p, 'रत्न') !== false) {
        return ["amount" => 80, "desc" => "रत्न एवं शास्त्रीय उपाय रिपोर्ट"];
    }
    if (strpos($p, 'कालसर्प') !== false || strpos($p, 'मंगल') !== false) {
        return ["amount" => 60, "desc" => "दोष परिहार रिपोर्ट (₹199)"];
    }
    return ["amount" => 295, "desc" => "ज्योतिष रिपोर्ट"];
}

$inc = getLeadIncentive($product);
$leadId = 'LEAD-' . date('ymd') . '-' . substr($cleanPhone, -4) . '-' . mt_rand(10, 99);
$now = date('Y-m-d H:i:s');

$leadsFile = __DIR__ . '/sutradhar_leads.json';
$leads = file_exists($leadsFile) ? json_decode(file_get_contents($leadsFile), true) : [];
if (!is_array($leads)) $leads = [];

// Check if customer already exists for this sutradhar
$foundIndex = -1;
foreach ($leads as $idx => $l) {
    if (($l['sutradhar_id'] ?? '') === $sutradharId && ($l['customer_phone'] ?? '') === $cleanPhone) {
        $foundIndex = $idx;
        break;
    }
}

if ($foundIndex >= 0) {
    // Update existing lead product/name if not yet paid
    if (($leads[$foundIndex]['status'] ?? '') !== 'paid') {
        $leads[$foundIndex]['customer_name'] = $custName;
        $leads[$foundIndex]['product'] = $inc['desc'];
        $leads[$foundIndex]['expected_incentive'] = $inc['amount'];
        $leads[$foundIndex]['updated_at'] = $now;
        $leadRecord = $leads[$foundIndex];
    } else {
        $leadRecord = $leads[$foundIndex];
    }
} else {
    $leadRecord = [
        "lead_id" => $leadId,
        "sutradhar_id" => $sutradharId,
        "customer_name" => $custName,
        "customer_phone" => $cleanPhone,
        "product" => $inc['desc'],
        "expected_incentive" => $inc['amount'],
        "status" => "pending_payment", // pending_payment, paid
        "payout_status" => "waiting_for_checkout", // waiting_for_checkout, transferred
        "upi_id" => $upiId ?: ($cleanPhone . '@upi'),
        "razorpay_payment_id" => null,
        "utr" => null,
        "created_at" => $now,
        "paid_at" => null
    ];
    $leads[] = $leadRecord;
}

file_put_contents($leadsFile, json_encode($leads, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Also persist to MySQL if configured
$configFile = __DIR__ . '/db_config.php';
if (file_exists($configFile)) {
    require_once $configFile;
    $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
    if (!$conn->connect_error) {
        $conn->query("CREATE TABLE IF NOT EXISTS sra_sutradhar_leads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lead_id VARCHAR(64) UNIQUE,
            sutradhar_id VARCHAR(64) NOT NULL,
            customer_name VARCHAR(128) NOT NULL,
            customer_phone VARCHAR(32) NOT NULL,
            product VARCHAR(128) NOT NULL,
            expected_incentive INT DEFAULT 0,
            status VARCHAR(32) DEFAULT 'pending_payment',
            payout_status VARCHAR(32) DEFAULT 'waiting_for_checkout',
            upi_id VARCHAR(128),
            razorpay_payment_id VARCHAR(64) NULL,
            utr VARCHAR(64) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            paid_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $stmt = $conn->prepare("INSERT INTO sra_sutradhar_leads 
            (lead_id, sutradhar_id, customer_name, customer_phone, product, expected_incentive, status, payout_status, upi_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', 'waiting_for_checkout', ?, ?)
            ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), product=VALUES(product), expected_incentive=VALUES(expected_incentive)");
        if ($stmt) {
            $stmt->bind_param("sssssiss", 
                $leadRecord['lead_id'], $sutradharId, $custName, $cleanPhone, $inc['desc'], $inc['amount'], $leadRecord['upi_id'], $now
            );
            $stmt->execute();
        }
        $conn->close();
    }
}

echo json_encode([
    "status" => "success",
    "lead_id" => $leadRecord['lead_id'],
    "customer_name" => $custName,
    "customer_phone" => $cleanPhone,
    "expected_incentive" => $inc['amount'],
    "message" => "✓ जातक लीड सफलतापूर्वक ERP में पंजीकृत हुई! जातक द्वारा वेबसाइट पर कूपन कोड (" . $sutradharId . ") से पेमेंट करते ही ₹" . $inc['amount'] . " कमीशन सीधे आपके UPI पर क्रेडिट हो जाएगा।"
], JSON_UNESCAPED_UNICODE);
