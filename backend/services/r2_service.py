import os
import logging
import boto3
from botocore.config import Config
from typing import Optional

logger = logging.getLogger(__name__)

class R2Service:
    """Service to interact with Cloudflare R2 (S3 compatible)"""
    
    _client = None
    
    @classmethod
    def get_client(cls):
        if cls._client is None:
            r2_account_id = os.environ.get("R2_ACCOUNT_ID")
            r2_access_key = os.environ.get("R2_ACCESS_KEY")
            r2_secret_key = os.environ.get("R2_SECRET_KEY")
            
            if not all([r2_account_id, r2_access_key, r2_secret_key]):
                logger.warning("R2 credentials missing — S3 operations will be skipped.")
                return None
                
            cls._client = boto3.client(
                service_name='s3',
                endpoint_url=f'https://{r2_account_id}.r2.cloudflarestorage.com',
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key,
                region_name='auto', # R2 uses auto
                config=Config(s_signature_version='s3v4')
            )
        return cls._client

    @staticmethod
    async def upload_file(file_path: str, bucket: str, key: str, content_type: Optional[str] = None):
        client = R2Service.get_client()
        if not client:
            return False
            
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        try:
            client.upload_file(file_path, bucket, key, ExtraArgs=extra_args)
            return True
        except Exception as e:
            logger.error("R2 upload_file error: %s", e, exc_info=True)
            return False

    @staticmethod
    async def upload_bytes(data: bytes, bucket: str, key: str, content_type: Optional[str] = None):
        client = R2Service.get_client()
        if not client:
            return False
            
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        try:
            client.put_object(Body=data, Bucket=bucket, Key=key, **extra_args)
            return True
        except Exception as e:
            logger.error("R2 upload_bytes error: %s", e, exc_info=True)
            return False
