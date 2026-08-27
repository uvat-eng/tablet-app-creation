const URL = 'https://functions.poehali.dev/85ee97e6-1ee1-4333-be9f-698f0c374677';

export type Row = Record<string, string | number | boolean | null>;

export const listRows = async (table: string): Promise<Row[]> => {
  const res = await fetch(`${URL}?table=${table}`);
  const data = await res.json();
  return data.items || [];
};

export const createRow = async (table: string, body: Row): Promise<Row> => {
  const res = await fetch(`${URL}?table=${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.item;
};

export const updateRow = async (table: string, body: Row): Promise<Row> => {
  const res = await fetch(`${URL}?table=${table}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.item;
};
