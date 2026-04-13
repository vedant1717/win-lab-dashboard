import hashlib
import os

try:
    import pyotp
except ImportError:
    print("FATAL: Please run 'pip install -r requirements.txt' first to install pyotp.")
    exit(1)

def main():
    print("=== NESCO CYBER LAB DASHBOARD ===")
    print("MFA Deployment & Gateway Setup\\n")
    
    username = "admin"
    password = "kpmg@1717"
    
    # Generate hashes
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    secret_key = os.urandom(24).hex()
    
    # Generate MFA Secret
    mfa_secret = pyotp.random_base32()
    
    # Write .env locally
    with open(".env", "w") as f:
        f.write(f"APP_USERNAME={username}\\n")
        f.write(f"APP_PASSWORD_HASH={password_hash}\\n")
        f.write(f"SECRET_KEY={secret_key}\\n")
        f.write(f"MFA_SECRET={mfa_secret}\\n")

    print("\\n[SUCCESS] Administrator Hash & Keys saved to '.env' securely.")
    
    # Build MFA Provisioning URI
    totp = pyotp.TOTP(mfa_secret)
    prov_uri = totp.provisioning_uri(name="admin", issuer_name="NESCO Cyber Lab")
    import urllib.parse
    qr_url = f"https://quickchart.io/qr?text={urllib.parse.quote(prov_uri)}&size=300"
    
    print("\\n[IMPORTANT] MULTI-FACTOR AUTHENTICATION REQUIREMENT")
    print("To finalize your setup, you must pair your official Authenticator App (Google/Microsoft):")
    print(f"1) RAW MANUAL KEY: {mfa_secret}")
    print(f"2) QR CODE LINK: Open this URL in your browser to physically scan the generated QR Code:")
    print(f"   {qr_url}")
    print("\\nOnce configured, you may start the system by running: python app.py")

if __name__ == "__main__":
    main()
