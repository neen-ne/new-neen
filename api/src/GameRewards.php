<?php
declare(strict_types=1);

final class GameRewards
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function awardCompletedWin(int $userId, string $gameSlug, int $sessionId): array
    {
        if (!$this->db->inTransaction()) {
            throw new LogicException('Game rewards must be issued inside the game completion transaction.');
        }
        if ($userId < 1 || $sessionId < 1 || !in_array($gameSlug, ['memory-match', 'picture-jigsaw'], true)) {
            throw new InvalidArgumentException('Invalid completed game reference.');
        }

        $lock = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $this->db->prepare(
            'SELECT s.id, s.user_id, s.status, s.expires_at, s.completed_at, s.matched_pairs,
                    g.slug, g.status AS game_status, g.reward_amount_coins
             FROM game_sessions s
             JOIN game_catalog g ON g.id = s.game_id
             WHERE s.id = :session_id AND s.user_id = :user_id AND g.slug = :slug'
             . $lock,
        );
        $statement->execute([
            'session_id' => $sessionId,
            'user_id' => $userId,
            'slug' => $gameSlug,
        ]);
        $session = $statement->fetch();
        if (
            $session === false
            || $session['status'] !== 'completed'
            || $session['completed_at'] === null
            || $session['game_status'] !== 'active'
            || $session['expires_at'] <= $this->now()
        ) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'A completed active game session is required for a reward.', 409);
        }

        if ($gameSlug === 'memory-match') {
            $this->verifyMemoryMatch($sessionId, (int) $session['matched_pairs']);
        } else {
            $this->verifyPictureJigsaw($sessionId);
        }

        $ledgerEntryId = (new CoinsLedger($this->db))->credit(
            $userId,
            'earned',
            (int) $session['reward_amount_coins'],
            'game_reward',
            'game-win-' . $gameSlug . '-' . $sessionId,
            'game_session',
            $sessionId,
            'Server-verified ' . $gameSlug . ' win.',
        );
        $entry = $this->db->prepare(
            'SELECT amount, balance_after, total_balance_after
             FROM coin_ledger WHERE id = :id AND user_id = :user_id',
        );
        $entry->execute(['id' => $ledgerEntryId, 'user_id' => $userId]);
        $balances = $entry->fetch();
        if ($balances === false) {
            throw new RuntimeException('The game reward ledger entry could not be read after credit.');
        }

        return [
            'amount' => (int) $balances['amount'],
            'balance_type' => 'earned',
            'earned_coin_balance' => (int) $balances['balance_after'],
            'coin_balance' => (int) $balances['total_balance_after'],
            'ledger_entry_id' => $ledgerEntryId,
        ];
    }

    private function verifyMemoryMatch(int $sessionId, int $matchedPairs): void
    {
        $lock = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $this->db->prepare(
            'SELECT deck_json, matched_cards_json, open_cards_json, mismatch_at
             FROM memory_match_states WHERE session_id = :session_id' . $lock,
        );
        $statement->execute(['session_id' => $sessionId]);
        $state = $statement->fetch();
        if ($state === false) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Memory Match board state is unavailable.', 409);
        }

        try {
            $deck = json_decode($state['deck_json'], true, 16, JSON_THROW_ON_ERROR);
            $matchedCards = json_decode($state['matched_cards_json'], true, 16, JSON_THROW_ON_ERROR);
            $openCards = json_decode($state['open_cards_json'], true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Memory Match board state is invalid.', 409);
        }
        if (
            !is_array($deck)
            || count($deck) < 2
            || count($deck) % 2 !== 0
            || !is_array($matchedCards)
            || !is_array($openCards)
            || $openCards !== []
            || $state['mismatch_at'] !== null
            || $matchedPairs !== count($deck) / 2
            || count($matchedCards) !== count($deck)
        ) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'Every Memory Match pair must be matched before awarding a win.', 409);
        }

        $imageCounts = [];
        foreach ($deck as $imageId) {
            if (!is_string($imageId) || $imageId === '') {
                throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Memory Match deck is invalid.', 409);
            }
            $imageCounts[$imageId] = ($imageCounts[$imageId] ?? 0) + 1;
        }
        foreach ($imageCounts as $count) {
            if ($count !== 2) {
                throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Memory Match deck does not contain complete pairs.', 409);
            }
        }
        foreach ($deck as $index => $imageId) {
            if (($matchedCards[(string) $index] ?? null) !== $imageId) {
                throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Memory Match result does not match the stored deck.', 409);
            }
        }
    }

    private function verifyPictureJigsaw(int $sessionId): void
    {
        $lock = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $statement = $this->db->prepare(
            'SELECT permutation_json, board_size FROM picture_jigsaw_states
             WHERE session_id = :session_id' . $lock,
        );
        $statement->execute(['session_id' => $sessionId]);
        $state = $statement->fetch();
        if ($state === false) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Picture Jigsaw board state is unavailable.', 409);
        }

        try {
            $permutation = json_decode($state['permutation_json'], true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'The Picture Jigsaw board state is invalid.', 409);
        }
        $boardSize = (int) $state['board_size'];
        $pieceCount = $boardSize ** 2;
        if (
            $boardSize < 2
            || !is_array($permutation)
            || count($permutation) !== $pieceCount
            || array_values($permutation) !== range(0, $pieceCount - 1)
        ) {
            throw new ApiException('GAME_WIN_NOT_VERIFIED', 'Every Picture Jigsaw piece must be in its correct position.', 409);
        }
    }

    private function now(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    }
}
