import re

with open('src/database/models.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace RETURNING * and return empty object for inserts
def replacer_insert(match):
    table = match.group(1)
    cols = match.group(2)
    vals = match.group(3)
    args = match.group(4)
    return f"INSERT INTO {table} ({cols})\n     VALUES ({vals})`,\n    [{args}]\n  );\n  return {{}};"

# Replace RETURNING * for updates (returning result.rows[0])
def replacer_update(match):
    table = match.group(1)
    set_clause = match.group(2)
    where_col = match.group(3)
    where_idx = match.group(4)
    args = match.group(5)
    
    arg_list = [x.strip() for x in args.split(',')]
    idx = int(where_idx) - 1
    where_var = arg_list[idx] if idx < len(arg_list) else 'unknown'
    
    return f"UPDATE {table} \n     SET{set_clause}WHERE {where_col} = ${where_idx}`,\n    [{args}]\n  );\n  const selectResult = await query('SELECT * FROM {table} WHERE {where_col} = $1', [{where_var}]);\n  return selectResult.rows[0];"

content = re.sub(
    r'UPDATE\s+([a-z_]+)\s+SET\s+([^W]+)\s+WHERE\s+([a-z_]+)\s*=\s*\$([0-9]+)\s*RETURNING \*;?`,\s*\[(.*?)\]\s*\);\s*return result\.rows\[0\];',
    replacer_update,
    content,
    flags=re.MULTILINE
)

content = re.sub(
    r'INSERT INTO ([a-z_]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)\s*RETURNING \*;?`,\s*\[(.*?)\]\s*\);\s*return result\.rows\[0\];',
    replacer_insert,
    content,
    flags=re.MULTILINE
)

with open('src/database/models.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
