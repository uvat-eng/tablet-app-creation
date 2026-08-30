import json
import os

import boto3
import psycopg2
import psycopg2.extras
from botocore.client import Config

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

CTYPE = 'application/vnd.android.package-archive'


def esc(value):
    return "'" + str(value).replace("'", "''") + "'"


def handler(event: dict, context) -> dict:
    """Выдаёт ссылку для заливки APK в хранилище и адрес для скачивания."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT s.id, s.name, s.role FROM sessions x "
        "JOIN staff s ON s.id = x.staff_id "
        "WHERE x.token = " + esc(token) + " AND x.expires_at > NOW() AND s.active = TRUE"
    )
    me = cur.fetchone()
    cur.close()
    conn.close()

    if not me:
        return {'statusCode': 401, 'headers': CORS,
                'body': json.dumps({'error': 'Нужно войти в систему'})}
    if me['role'] != 'owner':
        return {'statusCode': 403, 'headers': CORS,
                'body': json.dumps({'error': 'Загрузка приложения доступна только руководителю'})}

    body = json.loads(event.get('body') or '{}')
    key = body.get('key') or 'apk/malyshenskoe.apk'
    if not key.startswith('apk/') or not key.endswith('.apk'):
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'Можно загружать только файл приложения'})}

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
    )

    put_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': 'files', 'Key': key, 'ContentType': CTYPE},
        ExpiresIn=7200,
    )
    cdn = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'put_url': put_url, 'cdn_url': cdn}),
    }
