// URL parameters can be missing or repeated. Accept only a positive integer ID.
export function parseChatId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null;

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
