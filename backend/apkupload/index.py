import json
import os

import boto3
from botocore.client import Config

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

CTYPE = 'application/vnd.android.package-archive'


def handler(event: dict, context) -> dict:
    """Выдаёт ссылку для заливки APK в хранилище и адрес для скачивания."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    key = body.get('key') or 'apk/malyshenskoe.apk'

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