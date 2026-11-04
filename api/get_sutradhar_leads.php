<?php
// ============================================================================
// श्री राम जी एस्ट्रो (shriramjiastro.in) - आधिकारिक सूत्रधार लीड्स सूची API
// SRA GET SUTRADHAR LEADS API
// ============================================================================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$sutradharId = !empty($_GET['sutradhar_id']) ? strtoupper(trim($_GET['sutradhar_id'])) : (!empty($_POST['sutradhar_id']) ? strtoupper(trim($_POST['sutradhar_id'])) : '');
$phone = !empty($_GET['phone']) ? trim($_GET['phone']) : (!empty($_POST['phone']) ? trim($_POST['phone']) : '');

$leadsFile = __DIR__ . '/sutradhar_leads.json';
$leads = file_exists($leadsFile) ? json_decode(file_get_contents($leadsFile), true) : [];
if (!is_array($leads)) $leads = [];

$filtered = [];
foreach ($leads as $l) {
    if (empty($sutradharId) && empty($phone)) {
        $filtered[] = $l;
    } else if (!empty($sutradharId) && ($l['sutradhar_id'] ?? '') === $sutradharId) {
        $filtered[] = $l;
    } else if (!empty($phone) && substr($phone, -4) === substr($l['sutradhar_id'] ?? '', -4)) {
        $filtered[] = $l;
    }
}

// Sort newest first
usort($filtered, function($a, $b) {
    return strtotime($b['created_at'] ?? 'now') - strtotime($a['created_at'] ?? 'now');
});

echo json_encode([
    "status" => "success",
    "total" => count($filtered),
    "leads" => $filtered
], JSON_UNESCAPED_UNICODE);
