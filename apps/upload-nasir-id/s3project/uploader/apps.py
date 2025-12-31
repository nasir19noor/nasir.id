import sys
import boto3
import io
from botocore.exceptions import ClientError
from django.apps import AppConfig
from django.conf import settings
import time

class UploaderConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'uploader'

    def ready(self):
        """
        This method is called when Django starts.
        We'll use it to run our S3 connection and write permission check.
        """
        if 'runserver' in sys.argv:
            print("-----------------------------------------")
            print("Performing S3 bucket connection test...")
            try:
                if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY]):
                    print("S3 TEST FAILED: AWS credentials are not configured in settings.")
                    sys.exit(1)

                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                
                # Test 1: Check bucket existence and basic connectivity
                print("Step 1: Checking bucket existence...")
                s3_client.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
                print("-> Bucket exists and is accessible.")

                # Test 2: Check write permissions by uploading a dummy file
                print("Step 2: Checking write permissions...")
                dummy_file_key = 's3_connectivity_test.txt'
                dummy_file_content = b'This is a test file for S3 write permissions.'
                
                with io.BytesIO(dummy_file_content) as dummy_file:
                    s3_client.upload_fileobj(dummy_file, settings.AWS_STORAGE_BUCKET_NAME, dummy_file_key)
                
                print(f"-> Successfully uploaded dummy file '{dummy_file_key}'.")
                time.sleep(3)
                # Test 3: Clean up the dummy file
                print("Step 3: Cleaning up dummy file...")
                s3_client.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=dummy_file_key)
                print(f"-> Successfully deleted dummy file.")

                print("\nS3 TEST PASSED: All checks completed successfully.")

            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code")
                print(f"\nS3 TEST FAILED: Could not connect to or write to bucket '{settings.AWS_STORAGE_BUCKET_NAME}'.")
                print(f"AWS Error Code: {error_code}")
                print(f"AWS Error Message: {e}")
                print("\nTroubleshooting:")
                if error_code == '403' or 'Forbidden' in str(e):
                    print("- This is a PERMISSION-RELATED error. Check the IAM policy for your user.")
                    print("- Ensure the policy grants 's3:PutObject' and 's3:DeleteObject' actions on the bucket.")
                elif error_code == '404' or 'NoSuchBucket' in str(e):
                    print("- The BUCKET was not found. Check the AWS_STORAGE_BUCKET_NAME in your settings.")
                else:
                    print("- This may be a credentials or network issue. Verify your AWS keys and region.")
                sys.exit(1)
            except Exception as e:
                print(f"\nS3 TEST FAILED: An unexpected error occurred: {e}")
                sys.exit(1)
            finally:
                print("-----------------------------------------")