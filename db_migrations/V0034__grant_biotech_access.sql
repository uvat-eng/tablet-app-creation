UPDATE staff
SET permissions = permissions || ',biotech'
WHERE permissions IS NOT NULL
  AND permissions <> 'all'
  AND permissions <> ''
  AND position('biotech' in permissions) = 0;
