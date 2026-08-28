UPDATE staff
SET permissions = permissions || ',hunters'
WHERE permissions IS NOT NULL
  AND permissions <> 'all'
  AND permissions <> ''
  AND position('hunters' in permissions) = 0;
