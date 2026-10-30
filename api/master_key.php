<?php
/**
 * Owner master key check (server side). Mirrors sra-master.js:
 * salted SHA-256 iterated 50,000 times; only the hash is stored.
 */
function sra_is_master_key($code) {
    $key = strtoupper(trim((string)$code));
    $len = strlen($key);
    if ($len < 8 || $len > 12) return false;
    $h = 'ae6f38cffcbc76ea' . $key;
    for ($i = 0; $i < 50000; $i++) {
        $h = hash('sha256', $h);
    }
    return hash_equals('586640b5bb4ae92d41f2413bd3ff88b5ef4e43720259f76d7294aad29e5d3c86', $h);
}
