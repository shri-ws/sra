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
    return hash_equals('f0fe08d25612e21dfbf70e08a0028fc15c7dbc0d8089d335544586f4ac15c15a', $h);
}
