import os
import hvac
import sys

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-key-for-development'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['upload.nasir.id'] 

# This setting is the direct fix for your CSRF error.
# It tells Django to trust POST requests coming from your domain over HTTPS.
CSRF_TRUSTED_ORIGINS = ['https://upload.nasir.id']

# This tells Django to trust the 'X-Forwarded-Proto' header that Nginx sets.
# This header informs Django that the original request was made over HTTPS,
# even though the connection between Nginx and Django is plain HTTP.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Ensures the session cookie is only sent over HTTPS.
SESSION_COOKIE_SECURE = True

# Ensures the CSRF cookie is only sent over HTTPS.
CSRF_COOKIE_SECURE = True

# --- Large File Upload Settings ---
# Set the maximum size of an upload to 100 MB (in bytes).
# Django's default is 2.5 MB.
DATA_UPLOAD_MAX_MEMORY_SIZE = 1048576000 


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'uploader.apps.UploaderConfig',  # Uses the AppConfig for the S3 check
    'storages',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 's3project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 's3project.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
#     }
# }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    # ... default validators
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- Vault Configuration ---
VAULT_ADDR = os.environ.get('VAULT_ADDR', 'https://vault.nasir.id').strip('\'"')
VAULT_TOKEN = os.environ.get('VAULT_TOKEN')
VAULT_AWS_SECRET_PATH = 'aws/nasir'
VAULT_DB_SECRET_PATH = 'postgresql/upload'
VAULT_MOUNT_POINT = 'kv'

aws_secrets = {}
db_secrets = {}

try:
    # If a vault token is provided, attempt to connect and fetch secrets.
    # This is necessary for any command that needs secrets (runserver, migrate, etc.)
    if VAULT_TOKEN:
        client = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN)
        if client.is_authenticated():
            # Fetch AWS secrets
            aws_response = client.secrets.kv.v2.read_secret_version(
                path=VAULT_AWS_SECRET_PATH, mount_point=VAULT_MOUNT_POINT
            )
            aws_secrets = aws_response['data']['data']
            print("Successfully fetched AWS secrets from Vault.")

            # Fetch Database secrets
            db_response = client.secrets.kv.v2.read_secret_version(
                path=VAULT_DB_SECRET_PATH, mount_point=VAULT_MOUNT_POINT
            )
            db_secrets = db_response['data']['data']
            print("Successfully fetched Database secrets from Vault.")
        else:
            print("Could not authenticate with Vault. Please check your VAULT_TOKEN.")
    else:
        # Warn the user if the token is missing, as it's required for most operations.
        print("WARNING: VAULT_TOKEN environment variable not set. Database and S3 functionality will be disabled.")

except Exception as e:
    print(f"Error connecting to or reading from Vault: {e}")

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_secrets.get('DB_NAME'),
        'USER': db_secrets.get('DB_USER'),
        'PASSWORD': db_secrets.get('DB_PASSWORD'),
        'HOST': db_secrets.get('DB_HOST', 'localhost'),
        'PORT': db_secrets.get('DB_PORT', '5432'),
    }
}    

# --- AWS S3 Settings ---
AWS_ACCESS_KEY_ID = aws_secrets.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = aws_secrets.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = 'upload.nasir.id' # Your bucket name
AWS_S3_REGION_NAME = 'ap-southeast-1'

# Set the custom domain to your actual domain name.
# This requires that you have configured DNS (and likely a CDN)
# to point `upload.nasir.id` to your S3 bucket.
AWS_S3_CUSTOM_DOMAIN = 's3.ap-southeast-1.amazonaws.com/upload.nasir.id'

# The addressing style should still be virtual for buckets with dots.
AWS_S3_ADDRESSING_STYLE = 'virtual'

AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = 'public-read'
AWS_QUERYSTRING_AUTH = False

# Using the modern STORAGES setting (Django 4.2+) for more explicit configuration
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# The URL is now constructed using the custom domain with the http protocol.
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
# The root is the root of the bucket since upload_to='' in the model.
MEDIA_ROOT = ''

AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400', # Cache for 1 day
}

# --- Authentication Settings ---
# URL to redirect to for login, e.g., when a user tries to access a protected page
LOGIN_URL = 'login'

# URL to redirect to after a successful login
LOGIN_REDIRECT_URL = 'upload_file' 

# URL to redirect to after a successful logout
LOGOUT_REDIRECT_URL = 'login'