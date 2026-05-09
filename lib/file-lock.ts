type LockState = {
  locked: boolean;
  waiters: Array<() => void>;
};

const lockStates = new Map<string, LockState>();

async function acquire(key: string) {
  let state = lockStates.get(key);
  if (!state) {
    state = { locked: false, waiters: [] };
    lockStates.set(key, state);
  }

  if (!state.locked) {
    state.locked = true;
    return;
  }

  await new Promise<void>((resolve) => {
    state.waiters.push(resolve);
  });
}

function release(key: string) {
  const state = lockStates.get(key);
  if (!state) {
    return;
  }

  const next = state.waiters.shift();
  if (next) {
    next();
    return;
  }

  state.locked = false;
  lockStates.delete(key);
}

export async function withFileLock<T>(key: string, task: () => Promise<T>) {
  await acquire(key);
  try {
    return await task();
  } finally {
    release(key);
  }
}
