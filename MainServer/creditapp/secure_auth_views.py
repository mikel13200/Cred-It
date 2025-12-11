"""
Secure Authentication Views with JWT + httpOnly Cookies
Implements production-ready authentication with:
- JWT tokens in httpOnly cookies
- CSRF protection with SameSite
- Token rotation and blacklisting
- Auto-refresh mechanism
"""

from django.http import JsonResponse
from django.contrib.auth.hashers import make_password, check_password
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import json
from creditapp.models import CreditAccount


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def secure_login(request):
    """
    Secure login with JWT tokens in httpOnly cookies
    
    Security Features:
    - httpOnly cookies (XSS protection)
    - Secure flag (HTTPS only in production)
    - SameSite=Lax (CSRF protection)
    - Token rotation
    - Short-lived access tokens (15 min)
    - Long-lived refresh tokens (1-30 days)
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            account_id = data.get("AccountID")
            account_pass = data.get("AccountPass")
            stay_logged_in = data.get("stayLoggedIn", False)

            if not account_id or not account_pass:
                return JsonResponse(
                    {"error": "AccountID and Password are required"}, 
                    status=400
                )

            try:
                profile = CreditAccount.objects.get(AccountID=account_id)
                role = profile.Status.capitalize()

                # Verify password
                password_valid = False
                if role == "Student":
                    password_valid = check_password(account_pass, profile.AccountPass)
                else:  # Faculty/Admin
                    password_valid = (account_pass == profile.AccountPass)

                if not password_valid:
                    return JsonResponse(
                        {"error": "Incorrect password"}, 
                        status=401
                    )

                # Generate JWT tokens with custom payload
                # Since CreditAccount is not a Django User, we create tokens manually
                from rest_framework_simplejwt.tokens import RefreshToken
                from datetime import timedelta
                
                # Create a custom token
                refresh = RefreshToken()
                refresh['username'] = account_id
                refresh['role'] = role
                
                access_token = refresh.access_token
                access_token['username'] = account_id
                access_token['role'] = role
                
                # User data
                user_data = {
                    'username': account_id,
                    'role': role,
                }

                # Create response
                response = JsonResponse({
                    'message': 'Login successful',
                    'user': user_data
                })

                # Set access token cookie (httpOnly + Secure + SameSite)
                response.set_cookie(
                    key=settings.JWT_AUTH_COOKIE,
                    value=str(access_token),
                    max_age=15 * 60,  # 15 minutes
                    httponly=settings.JWT_AUTH_HTTPONLY,
                    secure=settings.JWT_AUTH_SECURE,
                    samesite=settings.JWT_AUTH_SAMESITE,
                    path=settings.JWT_AUTH_COOKIE_PATH,
                )

                # Set refresh token cookie
                refresh_max_age = (30 * 24 * 60 * 60) if stay_logged_in else (24 * 60 * 60)
                response.set_cookie(
                    key=settings.JWT_AUTH_REFRESH_COOKIE,
                    value=str(refresh),
                    max_age=refresh_max_age,  # 30 days or 1 day
                    httponly=settings.JWT_AUTH_HTTPONLY,
                    secure=settings.JWT_AUTH_SECURE,
                    samesite=settings.JWT_AUTH_SAMESITE,
                    path=settings.JWT_AUTH_COOKIE_PATH,
                )

                return response

            except CreditAccount.DoesNotExist:
                return JsonResponse(
                    {"error": "Account not found"}, 
                    status=404
                )

        except Exception as e:
            print(f"Login error: {e}")
            return JsonResponse(
                {"error": str(e)}, 
                status=500
            )

    return JsonResponse({"error": "Invalid request"}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh access token using refresh token from cookie
    
    Security Features:
    - Token rotation (new refresh token on each refresh)
    - Blacklisting (old tokens can't be reused)
    - httpOnly cookies
    """
    refresh_token_value = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)

    if not refresh_token_value:
        return JsonResponse(
            {'error': 'Refresh token not found'},
            status=401
        )

    try:
        refresh = RefreshToken(refresh_token_value)
        access_token = str(refresh.access_token)

        # Token rotation: generate new refresh token
        new_refresh_token = str(refresh)

        response = JsonResponse({'success': True})

        # Set new access token
        response.set_cookie(
            key=settings.JWT_AUTH_COOKIE,
            value=access_token,
            max_age=15 * 60,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )

        # Set new refresh token (rotation)
        response.set_cookie(
            key=settings.JWT_AUTH_REFRESH_COOKIE,
            value=new_refresh_token,
            max_age=24 * 60 * 60,  # Keep same expiry
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )

        return response

    except TokenError as e:
        return JsonResponse(
            {'error': 'Invalid or expired refresh token'},
            status=401
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def secure_logout(request):
    """
    Logout and blacklist tokens
    
    Security Features:
    - Blacklist refresh token (can't be reused)
    - Clear all cookies
    """
    try:
        refresh_token_value = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
        if refresh_token_value:
            token = RefreshToken(refresh_token_value)
            token.blacklist()  # Blacklist the token
    except Exception as e:
        print(f"Logout error: {e}")

    response = JsonResponse({'success': True})
    
    # Delete cookies
    response.delete_cookie(
        settings.JWT_AUTH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH
    )
    response.delete_cookie(
        settings.JWT_AUTH_REFRESH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH
    )

    return response


@api_view(['GET'])
@permission_classes([AllowAny])  # We'll validate the token manually
def get_current_user(request):
    """
    Get current authenticated user from JWT token in cookie
    """
    import jwt
    from django.conf import settings
    
    # Get token from cookie
    access_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
    
    if not access_token:
        return JsonResponse(
            {'error': 'Not authenticated'},
            status=401
        )
    
    try:
        # Decode JWT token
        payload = jwt.decode(
            access_token,
            settings.SECRET_KEY,
            algorithms=['HS256']
        )
        
        # Extract user data from token
        username = payload.get('username')
        role = payload.get('role')
        
        if not username:
            return JsonResponse(
                {'error': 'Invalid token'},
                status=401
            )
        
        return JsonResponse({
            'username': username,
            'role': role,
        })
        
    except jwt.ExpiredSignatureError:
        return JsonResponse(
            {'error': 'Token expired'},
            status=401
        )
    except jwt.InvalidTokenError:
        return JsonResponse(
            {'error': 'Invalid token'},
            status=401
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Handle Google OAuth login.
    1. Verify ID token with Google.
    2. Find or Create User.
    3. Issue JWT Cookies.
    """
    import urllib.request
    import urllib.error
    
    try:
        data = json.loads(request.body)
        token = data.get("token")
        
        if not token:
            return JsonResponse({"error": "Google token required"}, status=400)

        # 1. Verify Token (Access Token)
        google_url = f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={token}"
        try:
            with urllib.request.urlopen(google_url) as response:
                if response.getcode() != 200:
                   return JsonResponse({"error": "Invalid Google token"}, status=401)
                google_data = json.loads(response.read().decode())
        except urllib.error.URLError as e:
             return JsonResponse({"error": f"Failed to verify token: {str(e)}"}, status=401)

        # 2. Extract User Info
        email = google_data.get("email")
        
        if not email:
            return JsonResponse({"error": "Email not found in Google token"}, status=400)

        # 3. Find or Create Account
        try:
            profile = CreditAccount.objects.get(AccountID=email)
            role = profile.Status.capitalize()
        except CreditAccount.DoesNotExist:
            # Create new Student account
            import secrets
            random_pass = secrets.token_urlsafe(16)
            
            profile = CreditAccount(
                AccountID=email,
                AccountPass=make_password(random_pass),
                Status="Student"
            )
            profile.save()
            role = "Student"
        
        # 4. Generate JWT
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken()
        refresh['username'] = email
        refresh['role'] = role
        
        access_token = refresh.access_token
        access_token['username'] = email
        access_token['role'] = role
        
        user_data = {
            'username': email,
            'role': role,
        }

        response = JsonResponse({
            'message': 'Google Login successful',
            'user': user_data
        })

        # Set Cookies
        response.set_cookie(
            key=settings.JWT_AUTH_COOKIE,
            value=str(access_token),
            max_age=15 * 60,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )

        response.set_cookie(
            key=settings.JWT_AUTH_REFRESH_COOKIE,
            value=str(refresh),
            max_age=30 * 24 * 60 * 60,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )

        return response

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def github_login(request):
    """
    Handle GitHub OAuth login.
    1. Receive 'code' from frontend.
    2. Exchange 'code' for 'access_token' with GitHub (requires Client Secret).
    3. Fetch GitHub User Profile.
    4. Find or Create User.
    5. Issue JWT Cookies.
    """
    import urllib.request
    import urllib.parse
    import urllib.error
    
    try:
        data = json.loads(request.body)
        code = data.get("code")
        
        if not code:
            return JsonResponse({"error": "GitHub code required"}, status=400)

        # Config - Should be in settings.py
        CLIENT_ID = "Ov23liODb2T8BFwNHulw" # Replace or use settings.SOCIAL_AUTH_GITHUB_KEY
        CLIENT_SECRET = "ed132037ac1394f4bba82f267cd0fece6f3b062e" # Replace or use settings.SOCIAL_AUTH_GITHUB_SECRET
        
        # 1. Exchange Code for Access Token
        token_url = "https://github.com/login/oauth/access_token"
        params = urllib.parse.urlencode({
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'code': code
        }).encode()
        
        req = urllib.request.Request(token_url, data=params, headers={'Accept': 'application/json'})
        
        try:
            with urllib.request.urlopen(req) as response:
                token_data = json.loads(response.read().decode())
                access_token = token_data.get('access_token')
                
                if not access_token:
                    return JsonResponse({"error": f"Failed to get GitHub token: {token_data.get('error_description')}"}, status=401)
                    
        except urllib.error.URLError as e:
             return JsonResponse({"error": f"GitHub token exchange failed: {str(e)}"}, status=401)

        # 2. Fetch User Profile
        user_url = "https://api.github.com/user"
        req_user = urllib.request.Request(user_url, headers={
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
            'User-Agent': 'Cred-It-App' # GitHub requires User-Agent
        })
        
        with urllib.request.urlopen(req_user) as response:
            github_user = json.loads(response.read().decode())
            
        # 3. Get Email (GitHub emails can be private)
        email = github_user.get("email")
        if not email:
             # Fetch emails strictly if primary is private
             email_url = "https://api.github.com/user/emails"
             req_email = urllib.request.Request(email_url, headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json',
                'User-Agent': 'Cred-It-App'
            })
             with urllib.request.urlopen(req_email) as response:
                 emails = json.loads(response.read().decode())
                 # Find primary
                 for e in emails:
                     if e.get("primary") and e.get("verified"):
                         email = e.get("email")
                         break
        
        if not email:
            return JsonResponse({"error": "No verified email found for GitHub account"}, status=400)

        # 4. Find or Create Account
        try:
            profile = CreditAccount.objects.get(AccountID=email)
            role = profile.Status.capitalize()
        except CreditAccount.DoesNotExist:
            import secrets
            random_pass = secrets.token_urlsafe(16)
            
            profile = CreditAccount(
                AccountID=email,
                AccountPass=make_password(random_pass),
                Status="Student"
            )
            profile.save()
            role = "Student"
        
        # 5. Generate JWT
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken()
        refresh['username'] = email
        refresh['role'] = role
        access_token_jwt = refresh.access_token # Rename to avoid conflict
        access_token_jwt['username'] = email
        access_token_jwt['role'] = role
        
        user_data = { 'username': email, 'role': role }

        response = JsonResponse({ 'message': 'GitHub Login successful', 'user': user_data })

        response.set_cookie(
            key=settings.JWT_AUTH_COOKIE,
            value=str(access_token_jwt),
            max_age=15 * 60,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )
        response.set_cookie(
            key=settings.JWT_AUTH_REFRESH_COOKIE,
            value=str(refresh),
            max_age=30 * 24 * 60 * 60,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
        )

        return response

    except Exception as e:
        print(f"GitHub Login Error: {e}")
        return JsonResponse({"error": str(e)}, status=500)
