import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/* One subscription set per game, shared by the host table and every player
   phone. All three tables are RLS-filtered, so a phone receives its own hand
   row and nobody else's — the filtering is the database's job, not this
   hook's. See supabase/migrations/0010_kout.sql. */
export function useKoutGame(gameId) {
  const [game, setGame] = useState(null);
  const [seats, setSeats] = useState([]);
  const [hand, setHand] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return undefined;
    let alive = true;

    async function refetch() {
      const [g, s, h] = await Promise.all([
        supabase.from('kout_games').select('*').eq('id', gameId).maybeSingle(),
        supabase.from('kout_seats').select('*').eq('game_id', gameId).order('seat'),
        supabase.from('kout_hands').select('cards,seat').eq('game_id', gameId).maybeSingle(),
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
    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, seats, hand, loading, error };
}
