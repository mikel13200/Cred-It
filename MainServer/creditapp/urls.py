from django.urls import path
from .views import register_credit_profile, login_credit_profile
from .secure_auth_views import secure_login, refresh_token, secure_logout, get_current_user

urlpatterns = [
    # Legacy endpoints (keep for backward compatibility)
    path("register/", register_credit_profile, name="register_credit_profile"),
    path("login/", login_credit_profile, name="login_credit_profile"),
    
    # Secure JWT endpoints (new)
    path("auth/login/", secure_login, name="secure_login"),
    path("auth/refresh/", refresh_token, name="refresh_token"),
    path("auth/logout/", secure_logout, name="secure_logout"),
    path("auth/me/", get_current_user, name="current_user"),
]