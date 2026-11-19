<?php
declare(strict_types=1);

final class SunnyIsland extends ChallengeGame
{
    private const GAME_SLUG = 'sunny_island';
    private const OBJECTIVES_PER_ADVENTURE = 3;
    private const XP_PER_ADVENTURE = 100;
    private const XP_PER_LEVEL = 300;
    private const MINIMUM_PRODUCTION_DURATION_SECONDS = 10;
    private const ZONES = [
        ['id' => 'neon_pier', 'name' => 'Neon Pier'],
        ['id' => 'palm_grove', 'name' => 'Palm Grove'],
        ['id' => 'loot_canyon', 'name' => 'Loot Canyon'],
        ['id' => 'sunset_ridge', 'name' => 'Sunset Ridge'],
    ];
    private const COLLECTIBLES = [
        ['id' => 'golden_compass', 'name' => 'Golden Compass', 'image' => '/assets/hero-loot/gold-coin.png', 'rarity' => 'Legendary'],
        ['id' => 'neon_relic', 'name' => 'Neon Relic', 'image' => '/assets/hero-loot/weapon-ak47.png', 'rarity' => 'Epic'],
        ['id' => 'drift_token', 'name' => 'Drift Token', 'image' => '/assets/hero-loot/weapon-mp40.png', 'rarity' => 'Rare'],
        ['id' => 'sun_crate', 'name' => 'Sun Crate', 'image' => '/assets/hero-loot/loot-crate.webp', 'rarity' => 'Rare'],
        ['id' => 'palm_pack', 'name' => 'Palm Pack', 'image' => '/assets/hero-loot/backpack.webp', 'rarity' => 'Rare'],
        ['id' => 'snoop_badge', 'name' => 'Snoop Badge', 'image' => '/assets/hero-loot/snoop-sticker-01.png', 'rarity' => 'Epic'],
        ['id' => 'reef_sticker', 'name' => 'Reef Sticker', 'image' => '/assets/hero-loot/snoop-sticker-02.png', 'rarity' => 'Uncommon'],
        ['id' => 'sunset_sticker', 'name' => 'Sunset Sticker', 'image' => '/assets/hero-loot/snoop-sticker-03.png', 'rarity' => 'Epic'],
        ['id' => 'canyon_sticker', 'name' => 'Canyon Sticker', 'image' => '/assets/hero-loot/snoop-sticker-04.png', 'rarity' => 'Rare'],
    ];
    private const OBJECTIVES = [
        [
            'id' => 'collect_drops',
            'zone' => 'palm_grove',
            'description' => 'Collect three sunny drops in Palm Grove.',
            'target_count' => 3,
        ],
        [
            'id' => 'activate_beacons',
            'zone' => 'neon_pier',
            'description' => 'Activate the two beacons at Neon Pier.',
            'target_count' => 2,
        ],
        [
            'id' => 'reach_sunset_ridge',
            'zone' => 'sunset_ridge',
            'description' => 'Reach the lookout at Sunset Ridge.',
            'target_count' => 1,
        ],
        [
            'id' => 'find_relic',
            'zone' => 'loot_canyon',
            'description' => 'Find the Golden Compass in Loot Canyon.',
            'target_count' => 1,
            'collectible_id' => 'golden_compass',
        ],
    ];

    protected function slug(): string
    {
        return self::GAME_SLUG;
    }

    public function state(int $userId): array
    {
        $progress = $this->transaction(function () use ($userId): array {
            $this->ensureProgressRow($userId);
            return $this->progressRecord($userId);
        });
        $game = $this->catalog();
        $active = $game['status'] === 'active';
        $session = $active ? $this->current($userId) : null;
        if (($session['status'] ?? null) === 'completed') {
            $session = null;
        }

        return [
            'progress' => $progress,
            'zones' => self::ZONES,
            'codex' => self::COLLECTIBLES,
            'adventure' => [
                'status' => $game['status'],
                'free_attempts_per_day' => $game['free_attempts_per_day'],
                'attempts_remaining_today' => $active ? $this->attemptsRemainingToday($userId) : 0,
                'reward_amount_coins' => $game['reward_amount_coins'],
                'reset_timezone' => $game['reset_timezone'],
                'active_session' => $session,
            ],
        ];
    }

    public function catalog(): array
    {
        return parent::catalog() + [
            'zones' => self::ZONES,
            'codex' => self::COLLECTIBLES,
        ];
    }

    protected function initializeState(int $sessionId): void
    {
        $pool = self::OBJECTIVES;
        $objectives = [];
        for ($index = 0; $index < self::OBJECTIVES_PER_ADVENTURE; $index++) {
            $selectedIndex = random_int(0, count($pool) - 1);
            $objective = array_splice($pool, $selectedIndex, 1)[0];
            $objective['token'] = self::randomToken();
            $objectives[] = $objective;
        }

        $statement = $this->db->prepare(
            'INSERT INTO sunny_island_states
                (session_id, contract_json, completed_objectives_json)
             VALUES (:session_id, :contract_json, :completed_objectives_json)',
        );
        $statement->execute([
            'session_id' => $sessionId,
            'contract_json' => json_encode(
                ['version' => 1, 'objectives' => $objectives],
                JSON_THROW_ON_ERROR,
            ),
            'completed_objectives_json' => '[]',
        ]);
    }

    protected function publicGameState(int $sessionId): array
    {
        $state = $this->islandSessionRecord($sessionId);
        $contract = $this->decodeContract((string) $state['contract_json']);
        $completed = $this->jsonArray((string) $state['completed_objectives_json']);
        $completedIds = [];
        foreach ($completed as $receipt) {
            if (!is_array($receipt) || !is_string($receipt['id'] ?? null)) {
                throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island objective records are invalid.', 409);
            }
            $completedIds[] = $receipt['id'];
        }
        $objectives = [];
        foreach ($contract['objectives'] as $objective) {
            if (!is_array($objective) || !isset($objective['id'], $objective['zone'])) {
                throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island adventure contract is invalid.', 409);
            }
            $objectives[] = [
                'id' => $objective['id'],
                'zone' => $objective['zone'],
                'description' => $objective['description'],
                'target_count' => $objective['target_count'],
                'completed' => in_array($objective['id'], $completedIds, true),
            ];
        }

        return [
            'objectives' => $objectives,
            'objectives_total' => count($objectives),
            'objectives_completed' => count($completedIds),
        ];
    }

    public function syncProgress(int $userId, array $data): array
    {
        if (
            !array_intersect(['collectibles', 'discovered_zones', 'last_position', 'session_id', 'completed_objectives'], array_keys($data))
        ) {
            throw new ApiException('VALIDATION_ERROR', 'Sunny Island progress data is required.', 422);
        }

        return $this->transaction(function () use ($userId, $data): array {
            $session = null;
            $progress = $this->persistProgress($userId, $data);
            if (array_key_exists('session_id', $data)) {
                $sessionId = $this->validatedSessionId($data['session_id']);
                $this->recordObjectiveReports($userId, $sessionId, $data['completed_objectives'] ?? []);
                $session = $this->getState($userId, $sessionId);
            } elseif (array_key_exists('completed_objectives', $data)) {
                throw new ApiException('VALIDATION_ERROR', 'Objective reports require an adventure session.', 422);
            }

            $result = ['progress' => $progress];
            if ($session !== null) {
                $result['session'] = $session;
            }
            return $result;
        });
    }

    public function completeAdventure(
        int $userId,
        int $sessionId,
        mixed $completedObjectives,
        array $progressData,
    ): array {
        return $this->transaction(function () use (
            $userId,
            $sessionId,
            $completedObjectives,
            $progressData,
        ): array {
            $session = $this->lockedSession($userId, $sessionId);
            $this->assertMinimumDuration((string) $session['started_at']);
            $this->persistProgress($userId, $progressData);
            if ($completedObjectives !== null) {
                $this->recordObjectiveReports($userId, $sessionId, $completedObjectives);
            }

            $state = $this->islandSessionRecord($sessionId, true);
            $contract = $this->decodeContract((string) $state['contract_json']);
            $required = array_column($contract['objectives'], 'id');
            $completed = $this->jsonArray((string) $state['completed_objectives_json']);
            $completedIds = array_map(
                static fn (mixed $receipt): string => is_array($receipt) && is_string($receipt['id'] ?? null)
                    ? $receipt['id']
                    : '',
                $completed,
            );
            sort($required);
            sort($completedIds);
            if ($required === [] || $completedIds !== $required) {
                throw new ApiException('ADVENTURE_INCOMPLETE', 'All adventure objectives must be completed first.', 409);
            }

            $progress = $this->progressRecord($userId, true);
            $xp = (int) $progress['xp'] + self::XP_PER_ADVENTURE;
            $level = intdiv($xp, self::XP_PER_LEVEL) + 1;
            $now = $this->now();
            $statement = $this->db->prepare(
                'UPDATE sunny_island_progress
                 SET xp = :xp, level = :level,
                     total_adventures_completed = total_adventures_completed + 1,
                     updated_at = :updated_at
                 WHERE user_id = :user_id',
            );
            $statement->execute([
                'xp' => $xp,
                'level' => $level,
                'updated_at' => $now,
                'user_id' => $userId,
            ]);

            $result = $this->finish($userId, $sessionId, count($completedIds), $now);
            $result['progress'] = $this->progressRecord($userId);
            $result['xp_awarded'] = self::XP_PER_ADVENTURE;
            return $result;
        });
    }

    public static function collectibleIds(): array
    {
        return array_column(self::COLLECTIBLES, 'id');
    }

    public static function zoneIds(): array
    {
        return array_column(self::ZONES, 'id');
    }

    public static function objectiveIds(): array
    {
        return array_column(self::OBJECTIVES, 'id');
    }

    private function recordObjectiveReports(int $userId, int $sessionId, mixed $reports): void
    {
        if (!is_array($reports) || !array_is_list($reports) || count($reports) > self::OBJECTIVES_PER_ADVENTURE) {
            throw new ApiException('VALIDATION_ERROR', 'Adventure objective reports are invalid.', 422);
        }
        $session = $this->lockedSession($userId, $sessionId);
        $state = $this->islandSessionRecord($sessionId, true);
        $contract = $this->decodeContract((string) $state['contract_json']);
        $objectives = [];
        foreach ($contract['objectives'] as $objective) {
            if (
                !is_array($objective)
                || !is_string($objective['id'] ?? null)
                || !is_string($objective['zone'] ?? null)
            ) {
                throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island adventure contract is invalid.', 409);
            }
            $objectives[$objective['id']] = $objective;
        }

        $progress = $this->progressRecord($userId);
        $completed = $this->jsonArray((string) $state['completed_objectives_json']);
        $completedIds = [];
        foreach ($completed as $receipt) {
            if (
                !is_array($receipt)
                || !is_string($receipt['id'] ?? null)
                || !is_string($receipt['proof'] ?? null)
                || !isset($objectives[$receipt['id']])
                || !hash_equals(
                    hash_hmac('sha256', $receipt['id'], (string) $objectives[$receipt['id']]['token']),
                    $receipt['proof'],
                )
            ) {
                throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island objective records are invalid.', 409);
            }
            $completedIds[] = $receipt['id'];
        }
        $newObjectives = 0;
        foreach ($reports as $report) {
            if (!is_string($report) || !isset($objectives[$report])) {
                throw new ApiException('VALIDATION_ERROR', 'An adventure objective report is invalid.', 422);
            }
            $objective = $objectives[$report];
            if (
                !in_array($objective['zone'], $progress['discovered_zones'], true)
                || ($progress['last_position']['zone'] ?? null) !== $objective['zone']
            ) {
                throw new ApiException(
                    'OBJECTIVE_NOT_VERIFIED',
                    'Reach and discover the objective zone before reporting completion.',
                    409,
                );
            }
            if (
                ($objective['id'] === 'collect_drops'
                    && count($progress['unlocked_collectibles']) < (int) $objective['target_count'])
                || (isset($objective['collectible_id'])
                    && !in_array($objective['collectible_id'], $progress['unlocked_collectibles'], true))
            ) {
                throw new ApiException(
                    'OBJECTIVE_NOT_VERIFIED',
                    'The required Sunny Island collectibles have not been discovered.',
                    409,
                );
            }
            if (!in_array($report, $completedIds, true)) {
                $completed[] = [
                    'id' => $report,
                    'proof' => hash_hmac('sha256', $report, (string) $objective['token']),
                ];
                $completedIds[] = $report;
                $newObjectives++;
            }
        }

        $statement = $this->db->prepare(
            'UPDATE sunny_island_states
             SET completed_objectives_json = :completed_objectives_json
             WHERE session_id = :session_id',
        );
        $statement->execute([
            'completed_objectives_json' => json_encode(array_values($completed), JSON_THROW_ON_ERROR),
            'session_id' => $sessionId,
        ]);
        if ($newObjectives > 0) {
            $this->updateSession(
                $sessionId,
                'in_progress',
                (int) $session['move_count'] + $newObjectives,
                null,
                $this->now(),
            );
        }
    }

    private function assertMinimumDuration(string $startedAt): void
    {
        $minimum = self::MINIMUM_PRODUCTION_DURATION_SECONDS;
        if (getenv('APP_ENV') === 'test') {
            $configured = getenv('SUNNY_ISLAND_MIN_DURATION_SECONDS');
            if ($configured === false || $configured === '') {
                $minimum = 0;
            } elseif (!preg_match('/\A[0-9]{1,4}\z/', $configured)) {
                throw new RuntimeException('SUNNY_ISLAND_MIN_DURATION_SECONDS must be an integer from 0 to 9999 in test mode.');
            } else {
                $minimum = (int) $configured;
            }
        }

        $started = new DateTimeImmutable($startedAt, new DateTimeZone('UTC'));
        $elapsed = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->getTimestamp()
            - $started->getTimestamp();
        if ($elapsed < $minimum) {
            throw new ApiException(
                'ADVENTURE_TOO_FAST',
                'The Sunny Island adventure needs more time before it can be completed.',
                409,
            );
        }
    }

    private function persistProgress(int $userId, array $data): array
    {
        $this->ensureProgressRow($userId);
        $current = $this->progressRecord($userId, true);
        $collectibles = $current['unlocked_collectibles'];
        if (array_key_exists('collectibles', $data)) {
            foreach ($this->validatedList($data['collectibles'], self::collectibleIds(), 'collectibles') as $id) {
                if (!in_array($id, $collectibles, true)) {
                    $collectibles[] = $id;
                }
            }
        }

        $zones = $current['discovered_zones'];
        if (array_key_exists('discovered_zones', $data)) {
            foreach ($this->validatedList($data['discovered_zones'], self::zoneIds(), 'discovered_zones') as $id) {
                if (!in_array($id, $zones, true)) {
                    $zones[] = $id;
                }
            }
        }

        $position = $current['last_position'];
        if (array_key_exists('last_position', $data)) {
            $position = $this->validatedPosition($data['last_position']);
            if ($position !== null && !in_array($position['zone'], $zones, true)) {
                $zones[] = $position['zone'];
            }
        }

        $statement = $this->db->prepare(
            'UPDATE sunny_island_progress
             SET unlocked_collectibles_json = :collectibles,
                 discovered_zones_json = :zones,
                 last_position_json = :position,
                 updated_at = :updated_at
             WHERE user_id = :user_id',
        );
        $statement->execute([
            'collectibles' => json_encode($collectibles, JSON_THROW_ON_ERROR),
            'zones' => json_encode($zones, JSON_THROW_ON_ERROR),
            'position' => $position === null ? null : json_encode($position, JSON_THROW_ON_ERROR),
            'updated_at' => $this->now(),
            'user_id' => $userId,
        ]);
        return $this->progressRecord($userId);
    }

    private function validatedList(mixed $value, array $allowed, string $field): array
    {
        if (!is_array($value) || !array_is_list($value) || count($value) > count($allowed)) {
            throw new ApiException('VALIDATION_ERROR', 'Sunny Island ' . $field . ' are invalid.', 422);
        }
        $unique = [];
        foreach ($value as $item) {
            if (!is_string($item) || !in_array($item, $allowed, true) || in_array($item, $unique, true)) {
                throw new ApiException('VALIDATION_ERROR', 'Sunny Island ' . $field . ' are invalid.', 422);
            }
            $unique[] = $item;
        }
        return $unique;
    }

    private function validatedPosition(mixed $position): ?array
    {
        if ($position === null) {
            return null;
        }
        if (
            !is_array($position)
            || array_is_list($position)
            || count($position) !== 3
            || !is_string($position['zone'] ?? null)
            || !in_array($position['zone'], self::zoneIds(), true)
        ) {
            throw new ApiException('VALIDATION_ERROR', 'Sunny Island map coordinates are invalid.', 422);
        }
        $coordinates = [];
        foreach (['x', 'y'] as $axis) {
            $coordinate = $position[$axis] ?? null;
            if (
                (!is_int($coordinate) && !is_float($coordinate))
                || !is_finite((float) $coordinate)
                || $coordinate < 0
                || $coordinate > 100000
            ) {
                throw new ApiException('VALIDATION_ERROR', 'Sunny Island map coordinates are invalid.', 422);
            }
            $coordinates[$axis] = $coordinate;
        }
        return ['zone' => $position['zone'], 'x' => $coordinates['x'], 'y' => $coordinates['y']];
    }

    private function ensureProgressRow(int $userId): void
    {
        if ($userId < 1) {
            throw new ApiException('RESOURCE_NOT_FOUND', 'Account not found.', 404);
        }
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $insert = $driver === 'mysql' ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
        $statement = $this->db->prepare(
            $insert . ' INTO sunny_island_progress
                (user_id, xp, level, unlocked_collectibles_json, discovered_zones_json,
                 total_adventures_completed, last_position_json, created_at, updated_at)
             VALUES (:user_id, 0, 1, \'[]\', \'[]\', 0, NULL, :created_at, :updated_at)',
        );
        $now = $this->now();
        $statement->execute(['user_id' => $userId, 'created_at' => $now, 'updated_at' => $now]);
    }

    private function progressRecord(int $userId, bool $lock = false): array
    {
        $statement = $this->db->prepare(
            'SELECT xp, level, unlocked_collectibles_json, discovered_zones_json,
                    total_adventures_completed, last_position_json
             FROM sunny_island_progress WHERE user_id = :user_id'
             . ($lock ? $this->lockClause() : ''),
        );
        $statement->execute(['user_id' => $userId]);
        $row = $statement->fetch();
        if ($row === false) {
            throw new RuntimeException('Sunny Island progress row was not created.');
        }
        $position = null;
        if ($row['last_position_json'] !== null) {
            try {
                $decoded = json_decode((string) $row['last_position_json'], true, 16, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                throw new ApiException('GAME_STATE_INVALID', 'The saved Sunny Island position is invalid.', 409);
            }
            if (!is_array($decoded) || array_is_list($decoded)) {
                throw new ApiException('GAME_STATE_INVALID', 'The saved Sunny Island position is invalid.', 409);
            }
            $position = $decoded;
        }
        return [
            'xp' => (int) $row['xp'],
            'level' => (int) $row['level'],
            'unlocked_collectibles' => $this->jsonArray((string) $row['unlocked_collectibles_json']),
            'discovered_zones' => $this->jsonArray((string) $row['discovered_zones_json']),
            'total_adventures_completed' => (int) $row['total_adventures_completed'],
            'last_position' => $position,
        ];
    }

    private function islandSessionRecord(int $sessionId, bool $lock = false): array
    {
        $statement = $this->db->prepare(
            'SELECT contract_json, completed_objectives_json
             FROM sunny_island_states WHERE session_id = :session_id'
             . ($lock ? $this->lockClause() : ''),
        );
        $statement->execute(['session_id' => $sessionId]);
        $state = $statement->fetch();
        if ($state === false) {
            throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island adventure state is unavailable.', 409);
        }
        return $state;
    }

    private function decodeContract(string $json): array
    {
        try {
            $contract = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island adventure contract is invalid.', 409);
        }
        if (
            !is_array($contract)
            || array_is_list($contract)
            || ($contract['version'] ?? null) !== 1
            || !is_array($contract['objectives'] ?? null)
            || !array_is_list($contract['objectives'])
        ) {
            throw new ApiException('GAME_STATE_INVALID', 'The Sunny Island adventure contract is invalid.', 409);
        }
        return $contract;
    }

    private function validatedSessionId(mixed $sessionId): int
    {
        if (!is_int($sessionId) || $sessionId < 1) {
            throw new ApiException('VALIDATION_ERROR', 'A valid Sunny Island session is required.', 422);
        }
        return $sessionId;
    }

    private static function randomToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
