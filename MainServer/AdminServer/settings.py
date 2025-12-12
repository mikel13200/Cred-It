"""
Django settings for backend project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
AUTH_USER_MODEL = 'creditapp.CustomUser'

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-sup!9ul76)mya)!y$=y5i*9vp!jh3qt1slat+_!kpgfc%gf@@d")
DEBUG = True

ALLOWED_HOSTS = ["*"]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'debug_toolbar',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',  # JWT authentication
    'rest_framework_simplejwt.token_blacklist',  # Token blacklisting for logout
    'creditapp',
    'torchecker',
    'curriculum',
    'profiles',
    'requestTOR',
    'pendingRequest',
    'finalDocuments',
    'django_extensions',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "http://217.216.35.25:3000",
    "http://217.216.35.25:5173",
    "http://217.216.35.25:3000",
    "http://217.216.35.25:5173",

    # LOCALHOST
    "http://localhost:3000",
    "http://localhost:5173",
]

# Enable credentials (cookies, authorization headers)
CORS_ALLOW_CREDENTIALS = True

# Don't use CORS_ALLOW_ALL_ORIGINS with credentials
# CORS_ALLOW_ALL_ORIGINS = True  # ← Removed (conflicts with credentials)

ROOT_URLCONF = 'AdminServer.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'AdminServer.wsgi.application'

# Database (Railway PostgreSQL)
SECRET_KEY = os.getenv("SECRET_KEY")

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv("DB_NAME"),
        'USER': os.getenv("DB_USER"),
        'PASSWORD': os.getenv("DB_PASSWORD"),
        'HOST': os.getenv("DB_HOST"),
        'PORT': os.getenv("DB_PORT"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media Files (Uploaded TORs)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ============================================================================
# JWT & AUTHENTICATION SETTINGS
# ============================================================================

from datetime import timedelta

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'creditapp.authentication.JWTCookieAuthentication',  # Use our custom cookie auth
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# JWT Settings
SIMPLE_JWT = {
    # Token Lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Short-lived access token
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),     # Default refresh token (can be extended)
    
    # Token Rotation & Blacklisting
    'ROTATE_REFRESH_TOKENS': True,          # Generate new refresh token on refresh
    'BLACKLIST_AFTER_ROTATION': True,       # Blacklist old tokens (prevents reuse)
    'UPDATE_LAST_LOGIN': True,              # Update last_login field on login
    
    # Algorithm & Signing
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    # Token Headers
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    # Token Claims
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    
    # Sliding Tokens (not used, but configured)
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# Cookie Settings for JWT (httpOnly + Secure + SameSite)
JWT_AUTH_COOKIE = 'access_token'          # Cookie name for access token
JWT_AUTH_REFRESH_COOKIE = 'refresh_token' # Cookie name for refresh token
JWT_AUTH_SECURE = not DEBUG                # Use Secure flag in production (HTTPS only)
JWT_AUTH_HTTPONLY = True                   # Prevent JavaScript access (XSS protection)
JWT_AUTH_SAMESITE = 'Lax'                 # CSRF protection ('Strict' or 'Lax')
JWT_AUTH_COOKIE_PATH = '/'                 # Cookie path
