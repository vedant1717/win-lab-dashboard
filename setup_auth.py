import os

try:
    import pyotp
except ImportError:
    print("FATAL: Please run 'pip install -r requirements.txt' first to install pyotp.")
    exit(1)

def main():
    print("=== NESCO CYBER LAB DASHBOARD ===")
    print("MFA Deployment & Gateway Setup\\n")
    
    # Generate cryptographic parameters
    secret_key = os.urandom(24).hex()
    mfa_secret = pyotp.random_base32()
    
    # Write .env locally
    with open(".env", "w") as f:
        f.write(f"SECRET_KEY={secret_key}\\n")
        f.write(f"MFA_SECRET={mfa_secret}\\n")

    print("[SUCCESS] Core Security Keys generated and saved to '.env' securely.")
    
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
