<?php
declare(strict_types=1);

final class EnvLoader
{
    public static function load(string $path): void
    {
        if (!is_file($path) || !is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            throw new RuntimeException('Environment file could not be read.');
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (!str_contains($line, '=')) {
                continue;
            }

            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            if (
                !preg_match('/\A[A-Za-z_][A-Za-z0-9_]*\z/', $name)
                || getenv($name) !== false
                || array_key_exists($name, $_ENV)
                || array_key_exists($name, $_SERVER)
            ) {
                continue;
            }

            $value = trim($value);
            if (
                strlen($value) >= 2
                && (($value[0] === '"' && str_ends_with($value, '"'))
                    || ($value[0] === "'" && str_ends_with($value, "'")))
            ) {
                $quoted = $value[0] === '"';
                $value = substr($value, 1, -1);
                if ($quoted && str_contains($value, '\\')) {
                    $value = stripcslashes($value);
                }
            } else {
                $value = preg_replace('/\s+#.*$/', '', $value) ?? $value;
            }

            $_ENV[$name] = $value;
            putenv($name . '=' . $value);
        }
    }
}
