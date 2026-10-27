<?php
// Email API for the invitation: emails RSVPs and guestbook wishes through the SMTP server the site sends (see below).
//
// The invitation itself is a static site (GitHub Pages); this script runs on the VPS and is called cross-site,
// so it only answers browsers on the origins listed in ALLOWED_ORIGINS (plus localhost for development).
// .env lives one folder ABOVE this script's folder (never inside the web root): /opt/wedding/.env on the VPS,
// the project's .env locally. No dependencies: a small SMTP client (STARTTLS / implicit TLS) is at the bottom.
//
// One script, many invitations: each site sends its whole mail setup (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER,
// SMTP_PASS, SMTP_FROM, SMTP_TO) as "credentials", a token encrypted with MAIL_ENCRYPTION_KEY (see EMAIL.md and
// scripts/mail-credentials.mjs). So the server's .env only needs MAIL_ENCRYPTION_KEY and ALLOWED_ORIGINS. Any SMTP_*
// value in .env is used only for a request that sends no token.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Vary: Origin');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---- config -------------------------------------------------------------------------------

function load_env(): array
{
    foreach ([dirname(__DIR__) . '/.env', dirname(__DIR__, 2) . '/.env'] as $path) {
        if (!is_readable($path)) continue;
        $env = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$key, $value] = array_map('trim', explode('=', $line, 2));
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && str_ends_with($value, $value[0])) {
                $value = substr($value, 1, -1);
            }
            $env[$key] = $value;
        }
        return $env;
    }
    return [];
}

$env = load_env();

// ---- CORS: only the invitation's own site may call this from a browser ------------------------

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_filter(array_map(fn ($o) => rtrim(trim($o), '/'), explode(',', $env['ALLOWED_ORIGINS'] ?? '')));
$isLocal = (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin);
if ($origin !== '') {
    if (!$isLocal && !in_array($origin, $allowed, true)) respond(403, ['ok' => false, 'error' => 'origin']);
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'method']);

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) respond(400, ['ok' => false, 'error' => 'invalid']);

// ---- this invitation's mail setup (encrypted), if it sent one --------------------------------

if (isset($input['credentials']) && $input['credentials'] !== '') {
    $credentials = is_string($input['credentials']) ? decrypt_credentials($input['credentials'], $env['MAIL_ENCRYPTION_KEY'] ?? '') : null;
    if ($credentials === null) {
        error_log('send-mail: credentials could not be decrypted (is MAIL_ENCRYPTION_KEY the same as the site\'s?)');
        respond(400, ['ok' => false, 'error' => 'credentials']);
    }
    $env = array_merge($env, $credentials);
}

foreach (['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_TO'] as $key) {
    if (empty($env[$key])) {
        error_log("send-mail: missing $key (not in the site's credentials token, nor in .env)");
        respond(500, ['ok' => false, 'error' => 'config']);
    }
}
// SMTP_FROM / SMTP_TO need real addresses ("Name <you@example.com>" or "you@example.com"); real servers reject anything else
$recipientList = array_filter(array_map('trim', explode(',', $env['SMTP_TO'])));
foreach (['SMTP_FROM' => [$env['SMTP_FROM']], 'SMTP_TO' => $recipientList] as $key => $values) {
    foreach ($values as $value) {
        if (!filter_var(address($value), FILTER_VALIDATE_EMAIL)) {
            error_log("send-mail: $key has no valid email address (\"$value\"); use \"Name <you@example.com>\"");
            respond(500, ['ok' => false, 'error' => 'config']);
        }
    }
}

// ---- input --------------------------------------------------------------------------------

// Milliseconds between opening the invitation and sending. Bots post instantly; a guest needs at least a couple
// of seconds to type a name. Rejected openly (never a silent "ok"), so a real guest would at least see an error.
if ((int) ($input['elapsed'] ?? 0) < 2000) {
    error_log('send-mail: rejected a submission sent too quickly after the page opened');
    respond(400, ['ok' => false, 'error' => 'invalid']);
}

function field(array $input, string $key, int $max): string
{
    $value = $input[$key] ?? '';
    if (!is_string($value)) return '';
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    return mb_substr($value, 0, $max);
}

$type = field($input, 'type', 10);
$name = field($input, 'name', 80);
if ($name === '' || !in_array($type, ['rsvp', 'wish'], true)) respond(400, ['ok' => false, 'error' => 'invalid']);

date_default_timezone_set('Africa/Cairo');
$quote = null;
if ($type === 'rsvp') {
    $attending = field($input, 'attending', 3) === 'no' ? 'no' : 'yes';
    $guests = max(1, min(10, (int) field($input, 'guests', 3)));
    $subject = $attending === 'yes'
        ? "Attending: $name ($guests " . ($guests === 1 ? 'guest' : 'guests') . ')'
        : "Not attending: $name";
    $badge = $attending === 'yes'
        ? ['سيحضر إن شاء الله', 'Attending', '#14453a', '#e3efe9']
        : ['لن يتمكن من الحضور', 'Not attending', '#8a3b2e', '#f6e6e1'];
    $rows = [['الاسم', 'Name', $name], ['الحضور', 'Attending', $attending === 'yes' ? 'نعم · Yes' : 'لا · No']];
    if ($attending === 'yes') $rows[] = ['عدد الحضور', 'Guests', (string) $guests];
} else {
    $quote = field($input, 'text', 1000);
    if ($quote === '') respond(400, ['ok' => false, 'error' => 'invalid']);
    $subject = "Wishes from $name";
    $badge = ['تهنئة جديدة', 'New wishes', '#7a5a1c', '#f5ecd9'];
    $rows = [['من', 'From', $name]];
}
$rows[] = ['الوقت', 'Received', date('j M Y · g:i A')];
[$text, $html] = render_email($badge, $rows, $quote);

// ---- rate limit: 6 messages per visitor per 10 minutes --------------------------------------

// Behind Traefik every request arrives from Traefik's private address, so the guest's own address comes from
// X-Forwarded-For; it's only trusted when the direct peer is a private (proxy) address.
$client = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!filter_var($client, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $client = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
}
$bucket = sys_get_temp_dir() . '/wedding-mail-' . hash('sha256', $client);
$now = time();
$hits = array_filter(
    is_readable($bucket) ? (json_decode((string) file_get_contents($bucket), true) ?: []) : [],
    fn ($t) => is_int($t) && $t > $now - 600,
);
if (count($hits) >= 6) respond(429, ['ok' => false, 'error' => 'rate']);
$hits[] = $now;
@file_put_contents($bucket, json_encode(array_values($hits)), LOCK_EX);

// ---- send ---------------------------------------------------------------------------------

try {
    smtp_send($env, $subject, $text, $html);
    respond(200, ['ok' => true]);
} catch (Throwable $e) {
    error_log('send-mail: ' . $e->getMessage());
    respond(502, ['ok' => false, 'error' => 'send']);
}

// ---- email template -----------------------------------------------------------------------
// Table layout with inline styles so it renders the same in Gmail, Outlook and Apple Mail;
// the palette matches the invitation (emerald, ivory, antique gold).

function render_email(array $badge, array $rows, ?string $quote): array
{
    [$badgeAr, $badgeEn, $badgeInk, $badgeBg] = $badge;
    $e = fn (string $v) => htmlspecialchars($v, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    $text = "$badgeAr · $badgeEn\n\n";
    foreach ($rows as [$ar, $en, $value]) $text .= "$ar / $en: $value\n";
    if ($quote !== null) $text .= "\n«{$quote}»\n";
    $text .= "\n—\nمحمود ومريم · Mahmoud & Maryam · ٥ ديسمبر ٢٠٢٦\n";

    $rowsHtml = '';
    foreach ($rows as $i => [$ar, $en, $value]) {
        $border = $i === 0 ? '' : 'border-top:1px solid #eadfc8;';
        $rowsHtml .= "<tr><td style=\"{$border}padding:12px 0;width:42%;vertical-align:top;text-align:right;\">"
            . "<div style=\"font-size:14px;color:#6b6256;\">{$e($ar)}</div>"
            . "<div style=\"font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a89a80;text-align:right;\">{$e($en)}</div></td>"
            . "<td style=\"{$border}padding:12px 0;vertical-align:middle;text-align:left;font-size:16px;font-weight:bold;color:#1f2a24;\"><span dir=\"auto\">{$e($value)}</span></td></tr>";
    }
    $quoteHtml = $quote === null ? '' :
        "<tr><td style=\"padding:8px 32px 4px;\"><div style=\"border-right:3px solid #b08a42;background:#fbf8f1;border-radius:8px;padding:18px 20px;\">"
        . "<div style=\"font-family:'Amiri','Times New Roman',serif;font-size:30px;line-height:1;color:#b08a42;\">”</div>"
        . "<div style=\"font-size:17px;line-height:1.9;color:#1f2a24;white-space:pre-wrap;\" dir=\"auto\">{$e($quote)}</div></div></td></tr>";

    $html = <<<HTML
<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{$e($badgeEn)}</title></head>
<body style="margin:0;padding:0;background:#efe7d6;">
<div style="display:none;max-height:0;overflow:hidden;">{$e($badgeAr)} · {$e($badgeEn)} — {$e($rows[0][2])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe7d6;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px -24px rgba(20,69,58,.45);font-family:Tahoma,'Segoe UI',Arial,sans-serif;" dir="rtl">
  <tr><td align="center" style="background:#14453a;background-image:radial-gradient(circle at 50% 0%,#24614f 0%,#14453a 60%,#0f362d 100%);padding:34px 24px 28px;">
    <div style="width:46px;height:46px;line-height:46px;margin:0 auto 14px;border-radius:50%;background:#d8bd82;color:#14453a;font-size:20px;">♥</div>
    <div style="font-family:'Amiri','Times New Roman',serif;font-size:34px;line-height:1.2;color:#f6efe0;font-weight:bold;">محمود <span style="color:#d8bd82;font-weight:normal;">&amp;</span> مريم</div>
    <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:.06em;color:#d8bd82;" dir="ltr">Mahmoud &amp; Maryam</div>
    <div style="margin-top:12px;font-size:13px;color:#cfe0d8;">السبت ٥ ديسمبر ٢٠٢٦ · <span dir="ltr">Saturday 5 December 2026</span></div>
  </td></tr>
  <tr><td style="height:4px;background:#d8bd82;background-image:linear-gradient(90deg,#b08a42,#e6cf98,#b08a42);"></td></tr>
  <tr><td align="center" style="padding:28px 32px 6px;">
    <span style="display:inline-block;padding:8px 18px;border-radius:999px;background:{$badgeBg};color:{$badgeInk};font-size:15px;font-weight:bold;">{$e($badgeAr)} <span style="opacity:.55;">·</span> <span dir="ltr">{$e($badgeEn)}</span></span>
  </td></tr>
  {$quoteHtml}
  <tr><td style="padding:14px 32px 26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{$rowsHtml}</table>
  </td></tr>
  <tr><td align="center" style="background:#f6efe0;padding:18px 24px;border-top:1px solid #eadfc8;">
    <div style="font-size:12px;color:#8a7f6c;">أُرسلت من دعوة زفاف محمود ومريم</div>
    <div style="font-size:11px;color:#a89a80;margin-top:2px;" dir="ltr">Sent from the wedding invitation · White Plaza Askar Group, Nasr City</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    return [$text, $html];
}

// ---- encrypted credentials -----------------------------------------------------------------

/**
 * Token = base64url( 12-byte IV | 16-byte GCM tag | AES-256-GCM ciphertext of
 *         {"host","port","secure","user","pass","from","to"} ).
 * Returns the SMTP_* values, or null if the key is missing or wrong, or the token was tampered with.
 * host / port / secure may be missing (tokens made before they were added); .env then supplies them.
 */
function decrypt_credentials(string $token, string $encodedKey): ?array
{
    $key = base64_decode($encodedKey, true);
    $raw = base64_decode(strtr($token, '-_', '+/'), true);
    if ($key === false || strlen($key) !== 32 || $raw === false || strlen($raw) <= 28) return null;

    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    $data = $plain === false ? null : json_decode($plain, true);
    if (!is_array($data)) return null;

    $out = [];
    foreach (['user' => 'SMTP_USER', 'pass' => 'SMTP_PASS', 'from' => 'SMTP_FROM', 'to' => 'SMTP_TO'] as $field => $name) {
        if (!isset($data[$field]) || !is_string($data[$field]) || $data[$field] === '') return null;
        $out[$name] = $data[$field];
    }
    foreach (['host' => 'SMTP_HOST', 'port' => 'SMTP_PORT', 'secure' => 'SMTP_SECURE'] as $field => $name) {
        if (isset($data[$field]) && is_string($data[$field]) && $data[$field] !== '') $out[$name] = $data[$field];
    }
    // a hostname or IP, and a real port
    if (isset($out['SMTP_HOST']) && !preg_match('/^[A-Za-z0-9.-]{1,253}$/', $out['SMTP_HOST'])) return null;
    if (isset($out['SMTP_PORT']) && !(ctype_digit($out['SMTP_PORT']) && (int) $out['SMTP_PORT'] >= 1 && (int) $out['SMTP_PORT'] <= 65535)) return null;
    return $out;
}

// ---- minimal SMTP client -------------------------------------------------------------------

function address(string $value): string
{
    return preg_match('/<([^>]+)>/', $value, $m) ? trim($m[1]) : trim($value);
}

function encode_header(string $value): string
{
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function encode_mailbox(string $value): string
{
    // "Display Name <addr>" -> encoded display name + address
    if (preg_match('/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/', $value, $m) && $m[1] !== '') {
        return encode_header($m[1]) . ' <' . trim($m[2]) . '>';
    }
    return '<' . address($value) . '>';
}

function smtp_send(array $env, string $subject, string $text, string $html): void
{
    $host = $env['SMTP_HOST'];
    $port = (int) $env['SMTP_PORT'];
    $implicitTls = $port === 465 || in_array(strtolower($env['SMTP_SECURE'] ?? ''), ['true', '1', 'ssl', 'tls'], true);

    $socket = @stream_socket_client(
        ($implicitTls ? 'ssl://' : 'tcp://') . "$host:$port",
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        stream_context_create(['ssl' => ['peer_name' => $host, 'SNI_enabled' => true]]),
    );
    if (!$socket) throw new RuntimeException("connect failed: $errstr ($errno)");
    stream_set_timeout($socket, 15);

    $read = function () use ($socket): array {
        $text = '';
        while (($line = fgets($socket, 1024)) !== false) {
            $text .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return [(int) substr($text, 0, 3), $text];
    };
    $command = function (?string $line, array $expect) use ($socket, $read): string {
        if ($line !== null) fwrite($socket, $line . "\r\n");
        [$code, $text] = $read();
        if (!in_array($code, $expect, true)) {
            $shown = $line !== null && str_starts_with($line, 'AUTH') ? 'AUTH' : ($line ?? 'greeting');
            throw new RuntimeException("SMTP $shown -> $text");
        }
        return $text;
    };

    $command(null, [220]);
    $helo = 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $features = $command($helo, [250]);

    if (!$implicitTls && stripos($features, 'STARTTLS') !== false) {
        $command('STARTTLS', [220]);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('STARTTLS failed');
        }
        $command($helo, [250]);
    }

    $command('AUTH LOGIN', [334]);
    $command(base64_encode($env['SMTP_USER']), [334]);
    $command(base64_encode($env['SMTP_PASS']), [235]);

    $from = address($env['SMTP_FROM']);
    $recipients = array_filter(array_map('trim', explode(',', $env['SMTP_TO'])));
    $command("MAIL FROM:<$from>", [250]);
    foreach ($recipients as $to) $command('RCPT TO:<' . address($to) . '>', [250, 251]);

    $headers = [
        'Date: ' . date(DATE_RFC2822),
        'From: ' . encode_mailbox($env['SMTP_FROM']),
        'To: ' . implode(', ', array_map(fn ($to) => '<' . address($to) . '>', $recipients)),
        'Subject: ' . encode_header($subject),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'localhost') . '>',
        'MIME-Version: 1.0',
    ];
    // plain-text and HTML versions of the same message; mail apps show the best one they support
    $boundary = 'b' . bin2hex(random_bytes(12));
    $headers[] = "Content-Type: multipart/alternative; boundary=\"$boundary\"";
    $part = fn (string $type, string $content) => "--$boundary\r\nContent-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($content));
    $message = $part('text/plain', $text) . $part('text/html', $html) . "--$boundary--\r\n";
    $command('DATA', [354]);
    fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n" . $message . ".\r\n");
    $command(null, [250]);
    $command('QUIT', [221]);
    fclose($socket);
}
