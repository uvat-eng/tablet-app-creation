import base64
import json
import os
import uuid

import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

EXT = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}


def handler(event: dict, context) -> dict:
    """Загрузка фотографий объектов и трофеев в хранилище."""
    method = event.get('httpMethod', 'POST')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if method != 'POST':
        return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method'})}

    body = json.loads(event.get('body') or '{}')
    data_url = body.get('file', '')
    folder = body.get('folder', 'photos')

    if ',' in data_url and data_url.startswith('data:'):
        head, payload = data_url.split(',', 1)
        content_type = head.split(';')[0].replace('data:', '') or 'image/jpeg'
    else:
        payload = data_url
        content_type = body.get('content_type', 'image/jpeg')

    if not payload:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'no file'})}

    binary = base64.b64decode(payload)
    if len(binary) > 8 * 1024 * 1024:
        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'error': 'Файл больше 8 МБ'})}

    key = folder + '/' + uuid.uuid4().hex + '.' + EXT.get(content_type, 'jpg')

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=binary, ContentType=content_type)

    url = 'https://cdn.poehali.dev/projects/' + os.environ['AWS_ACCESS_KEY_ID'] + '/bucket/' + key
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'url': url})}
