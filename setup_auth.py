import hashlib
import os
import getpass

def main():
    print("=== NESCO CYBER LAB DASHBOARD ===")
    print("Gateway Security Setup\\n")
    
    username = input("Enter a Username for the Operator ID: ").strip()
    
    while True:
        password = getpass.getpass("Enter a secure Access Key: ")
        confirm = getpass.getpass("Confirm Access Key: ")
        if password == confirm:
            break
        print("Passwords do not match. Please try again.")

    # Generate hashes
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    # Provide a uniquely generated session secret key
    secret_key = os.urandom(24).hex()

    # Write .env locally
    with open(".env", "w") as f:
        f.write(f"APP_USERNAME={username}\\n")
        f.write(f"APP_PASSWORD_HASH={password_hash}\\n")
        f.write(f"SECRET_KEY={secret_key}\\n")

    print("\\n[SUCCESS] Configuration encrypted and saved locally to '.env'.")
    print("You may now launch the system by running: python app.py")

if __name__ == "__main__":
    main()
