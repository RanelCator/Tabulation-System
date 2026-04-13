type RouletteSpinEvent = {
  type: "spin_result";
  sessionId: string;
  resultId: string;
  winner: {
    participantId: string;
    participantName: string;
  };
  wheelParticipants: Array<{
    id: string;
    name: string;
    orderNo: number;
  }>;
  createdAt: string;
};

type Listener = (event: RouletteSpinEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(sessionId: string, listener: Listener) {
  if (!listeners.has(sessionId)) {
    listeners.set(sessionId, new Set());
  }

  listeners.get(sessionId)!.add(listener);

  return () => {
    listeners.get(sessionId)?.delete(listener);
  };
}

export function publish(event: RouletteSpinEvent) {
  const sessionListeners = listeners.get(event.sessionId);
  if (!sessionListeners) return;

  for (const listener of sessionListeners) {
    listener(event);
  }
}