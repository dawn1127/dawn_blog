export function titleFromFirstMessage(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "New conversation";
  }

  return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
}
