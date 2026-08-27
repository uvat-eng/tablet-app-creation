const URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';

export type Row = Record<string, string | number | boolean | null>;

export const listRows = async (table: string): Promise<Row[]> => {
  const res = await fetch(`${URL}?table=${table}`);
  const data = await res.json();
  return data.items || [];
};

export class ConflictError extends Error {
  conflict: Row;

  constructor(conflict: Row) {
    super('conflict');
    this.conflict = conflict;
  }
}

const send = async (table: string, method: string, body: Row): Promise<Row> => {
  const res = await fetch(`${URL}?table=${table}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.status === 409) throw new ConflictError(data.conflict);
  return data.item;
};

export const createRow = (table: string, body: Row) => send(table, 'POST', body);

export const updateRow = (table: string, body: Row) => send(table, 'PUT', body);