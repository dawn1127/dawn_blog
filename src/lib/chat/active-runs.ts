type ActiveChatRun = {
  controller: AbortController;
  canceled: boolean;
};

const activeChatRuns = new Map<string, ActiveChatRun>();

export function registerActiveChatRun(runId: string, controller: AbortController) {
  activeChatRuns.set(runId, {
    controller,
    canceled: false,
  });
}

export function cancelActiveChatRun(runId: string) {
  const activeRun = activeChatRuns.get(runId);

  if (!activeRun) {
    return false;
  }

  activeRun.canceled = true;
  activeRun.controller.abort();
  return true;
}

export function isActiveChatRunCanceled(runId: string) {
  return activeChatRuns.get(runId)?.canceled ?? false;
}

export function unregisterActiveChatRun(runId: string) {
  activeChatRuns.delete(runId);
}
