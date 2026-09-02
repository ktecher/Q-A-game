import { useEffect, useState } from 'react';

/* One subscription set per game, shared by the host table and every player
   phone. All three tables are RLS-filtered, so a phone receives its own hand
   row and nobody else's — the filtering is the database's job, not this
   hook's. See supabase/migrations/0010_kout.sql.

   `client` is required and NOT defaulted, because RLS — for the queries and
   for the realtime subscription alike — is evaluated against whichever
   client's session is passed. The host passes the main app client (it reads
   as kout_games.host_id); a player passes the isolated player client (it
   reads as its own seat). Pass the host's client on a player screen and the
   player is seated but silently never receives a hand. See koutClient.js. */
export function useKoutGame(gameId, client) {
  const [game, setGame] = useState(null);
  const [seats, setSeats] = useState([]);
  const [hand, setHand] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !client) return undefined;
    let alive = true;

    async function refetch() {
      const [g, s, h] = await Promise.all([
        client.from('kout_games').select('*').eq('id', gameId).maybeSingle(),
        client.from('kout_seats').select('*').eq('game_id', gameId).order('seat'),
        client.from('kout_hands').select('cards,seat').eq('game_id', gameId).maybeSingle(),
      ]);
      if (!alive) return;
      const failed = g.error ?? s.error ?? h.error;
      setError(failed ? failed.message : null);
      setGame(g.data ?? null);
      setSeats(s.data ?? []);
      setHand(h.data?.cards ?? null);
      setLoading(false);
    }

    refetch();

    // Refetch rather than patch from the payload: a round is a handful of
    // events per minute, so the extra query is free, and it removes a whole
    // class of "my local copy drifted" bug.
    const channel = client
      .channel(`kout-${gameId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_games', filter: `id=eq.${gameId}` },
          refetch)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_seats', filter: `game_id=eq.${gameId}` },
          refetch)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'kout_hands', filter: `game_id=eq.${gameId}` },
          refetch)
      .subscribe();

    return () => {
      alive = false;
      client.removeChannel(channel);
    };
  }, [gameId, client]);

  return { game, seats, hand, loading, error };
}
